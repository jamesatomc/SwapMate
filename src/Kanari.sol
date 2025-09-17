// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {FHE, euint64, externalEuint64} from "lib/zama-lib/src/FHE.sol";
import {SepoliaConfig} from "lib/zama-lib/src/ZamaConfig.sol";

/// @title Kanari Token - Native token of the Kanari ecosystem
/// @notice Utility token with deflationary mechanics and staking rewards
/// @notice The contract inherits SepoliaConfig to configure the FHE coprocessor for Sepolia
contract Kanari is ERC20, Ownable, SepoliaConfig {
    uint8 private _decimals;
    uint256 public constant MAX_SUPPLY = 11_000_000 * 10 ** 18; // 11M tokens max
    uint256 public burnRate = 100; // 1% burn rate (100 basis points)
    uint256 public constant BASIS_POINTS = 10000;

    mapping(address => bool) public excludedFromBurn;
    mapping(address => bool) public minters;

    // Encrypted balances stored as euint64 for each account (example integration)
    // NOTE: Encrypted balances are managed manually by minters via the provided functions.
    // They are NOT automatically synced with on-chain ERC20 balances. See README/docs for sync
    // strategies or remove this state if you don't have a trusted off-chain sync mechanism.
    mapping(address => euint64) private _encryptedBalances;

    /// @notice Emitted when an account's encrypted balance is updated by a minter
    event EncryptedBalanceUpdated(address indexed account, bytes32 encryptedValue);

    uint256 public totalBurned;

    event TokensBurned(uint256 amount);
    event BurnRateUpdated(uint256 newRate);
    event ExcludedFromBurn(address indexed account, bool excluded);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    modifier onlyMinter() {
        // Restrict to authorized minters. Do NOT leave this commented out in production.
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized minter");
        _;
    }

    constructor() ERC20("Kanari Token", "KANARI") Ownable(msg.sender) SepoliaConfig() {
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

    /// @notice Returns the encrypted balance for an account
    function encryptedBalanceOf(address account) external view returns (euint64) {
        return _encryptedBalances[account];
    }

    /// @notice Set an account's encrypted balance from an external handle + proof
    /// @dev Only callable by minters (or owner depending on `onlyMinter` modifier)
    function setEncryptedBalance(address account, externalEuint64 inputEuint64, bytes calldata inputProof)
        external
        onlyMinter
    {
        euint64 encrypted = FHE.fromExternal(inputEuint64, inputProof);

        _encryptedBalances[account] = encrypted;

        // Allow the coprocessor and the account to access/decrypt this ciphertext
        FHE.allowThis(_encryptedBalances[account]);
        FHE.allow(_encryptedBalances[account], account);
        emit EncryptedBalanceUpdated(account, euint64.unwrap(encrypted));
    }

    /// @notice Increase an account's encrypted balance by an encrypted amount
    function increaseEncryptedBalance(address account, externalEuint64 inputEuint64, bytes calldata inputProof)
        external
        onlyMinter
    {
        euint64 encrypted = FHE.fromExternal(inputEuint64, inputProof);

        _encryptedBalances[account] = FHE.add(_encryptedBalances[account], encrypted);

        FHE.allowThis(_encryptedBalances[account]);
        FHE.allow(_encryptedBalances[account], account);
        emit EncryptedBalanceUpdated(account, euint64.unwrap(_encryptedBalances[account]));
    }

    /// @notice Decrease an account's encrypted balance by an encrypted amount
    function decreaseEncryptedBalance(address account, externalEuint64 inputEuint64, bytes calldata inputProof)
        external
        onlyMinter
    {
        euint64 encrypted = FHE.fromExternal(inputEuint64, inputProof);

        _encryptedBalances[account] = FHE.sub(_encryptedBalances[account], encrypted);

        FHE.allowThis(_encryptedBalances[account]);
        FHE.allow(_encryptedBalances[account], account);
        emit EncryptedBalanceUpdated(account, euint64.unwrap(_encryptedBalances[account]));
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Override `_update` to include burn mechanism for all transfer/mint/burn entry points
    /// OpenZeppelin's `_transfer` is not virtual in this version, but `_update` is. Override `_update`
    /// to apply burn consistently and safely (handles allowance and balance checks in the parent).
    function _update(address from, address to, uint256 value) internal override {
        bool isTransfer = (from != address(0) && to != address(0));
        bool isDirectBurn = (to == address(0) && from != address(0));

        if (isTransfer) {
            uint256 burnAmount = _calculateBurn(from, value);
            if (burnAmount > 0) {
                // Apply burn tax by sending burnAmount to zero address
                // and reduce transfer amount accordingly
                value -= burnAmount;
                super._update(from, address(0), burnAmount);
                totalBurned += burnAmount;
                emit TokensBurned(burnAmount);
            }
        }

        // Perform the main operation (transfer/mint/burn) with adjusted value
        super._update(from, to, value);

        // If this was a direct burn (e.g., caller invoked burn()), track it here
        if (isDirectBurn) {
            totalBurned += value;
            emit TokensBurned(value);
        }
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
        // Delegate to internal burn which will route through `_update` and
        // correctly track `totalBurned` and emit `TokensBurned` once.
        _burn(msg.sender, amount);
    }

    /// @notice Check if an address is excluded from burn
    function isExcludedFromBurn(address account) external view returns (bool) {
        return excludedFromBurn[account];
    }

    /// @notice Get circulating supply (total - burned)
    function circulatingSupply() external view returns (uint256) {
        return totalSupply() - totalBurned;
    }
}
