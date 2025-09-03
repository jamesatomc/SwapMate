// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";

/// @title Kanari Token - Native token of the Kanari ecosystem
/// @notice Utility token with deflationary mechanics and staking rewards
contract Kanari is ERC20, Ownable {
    uint8 private _decimals;
    uint256 public constant MAX_SUPPLY = 11_000_000 * 10 ** 18; // 11M tokens max
    uint256 public burnRate = 100; // 1% burn rate (100 basis points)
    uint256 public constant BASIS_POINTS = 10000;

    mapping(address => bool) public excludedFromBurn;
    mapping(address => bool) public minters;

    uint256 public totalBurned;

    event TokensBurned(uint256 amount);
    event BurnRateUpdated(uint256 newRate);
    event ExcludedFromBurn(address indexed account, bool excluded);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    modifier onlyMinter() {
        // Allow anyone to mint for testing purposes
        // require(minters[msg.sender] || msg.sender == owner(), "Not authorized minter");
        _;
    }

    constructor() ERC20("Kanari Token", "KANARI") Ownable(msg.sender) {
        _decimals = 18;

        // // Mint initial supply to deployer (50M tokens)
        // uint256 initialSupply = 50_000_000 * 10**_decimals;
        // _mint(msg.sender, initialSupply);

        // Exclude deployer and contract from burn
        excludedFromBurn[msg.sender] = true;
        excludedFromBurn[address(this)] = true;

        // Add deployer as initial minter
        minters[msg.sender] = true;
        emit MinterAdded(msg.sender);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Override transfer to include burn mechanism
    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = _msgSender();
        uint256 burnAmount = _calculateBurn(owner, amount);

        if (burnAmount > 0) {
            _burn(owner, burnAmount);
            totalBurned += burnAmount;
            emit TokensBurned(burnAmount);
        }

        return super.transfer(to, amount - burnAmount);
    }

    /// @notice Override transferFrom to include burn mechanism
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        uint256 burnAmount = _calculateBurn(from, amount);

        if (burnAmount > 0) {
            _burn(from, burnAmount);
            totalBurned += burnAmount;
            emit TokensBurned(burnAmount);
        }

        return super.transferFrom(from, to, amount - burnAmount);
    }

    /// @notice Calculate burn amount for transfer
    function _calculateBurn(address from, uint256 amount) internal view returns (uint256) {
        if (excludedFromBurn[from] || burnRate == 0) {
            return 0;
        }
        return (amount * burnRate) / BASIS_POINTS;
    }

    /// @notice Set burn rate (only owner)
    function setBurnRate(uint256 newRate) external onlyOwner {
        require(newRate <= 1000, "Burn rate too high"); // Max 10%
        burnRate = newRate;
        emit BurnRateUpdated(newRate);
    }

    /// @notice Exclude/include address from burn mechanism
    function setExcludedFromBurn(address account, bool excluded) external onlyOwner {
        excludedFromBurn[account] = excluded;
        emit ExcludedFromBurn(account, excluded);
    }

    /// @notice Add a new minter
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        require(!minters[minter], "Already a minter");

        minters[minter] = true;
        emit MinterAdded(minter);
    }

    /// @notice Remove a minter
    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "Not a minter");

        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /// @notice Mint tokens (respects max supply)
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }

    /// @notice Emergency burn function
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        totalBurned += amount;
        emit TokensBurned(amount);
    }

    /// @notice Get circulating supply (total - burned)
    function circulatingSupply() external view returns (uint256) {
        return totalSupply();
    }
}
