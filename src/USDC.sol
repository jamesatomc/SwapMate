// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";

/// @title USDC Token - USD Stablecoin
/// @notice A USD-pegged stablecoin with minting/burning capabilities
contract USDC is ERC20, Ownable {
    uint8 private _decimals;
    
    mapping(address => bool) public minters;
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    
    modifier onlyMinter() {
        // Allow anyone to mint for testing purposes
        // require(minters[msg.sender] || msg.sender == owner(), "Not authorized minter");
        _;
    }
    
    constructor() ERC20("USD Kanari", "USDC") Ownable(msg.sender) {
        _decimals = 6; // USDC-like 6 decimals
        
        // // Mint initial supply to deployer
        // _mint(msg.sender, 1_000_000 * 10**_decimals); // 1M USDC
        
        // Add deployer as initial minter
        minters[msg.sender] = true;
        emit MinterAdded(msg.sender);
    }
    
    function decimals() public view override returns (uint8) {
        return _decimals;
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
    
    /// @notice Mint tokens to specified address
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, amount);
    }
    
    /// @notice Burn tokens from specified address (requires approval)
    function burnFrom(address from, uint256 amount) external onlyMinter {
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
    }
    
    /// @notice Burn own tokens
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
