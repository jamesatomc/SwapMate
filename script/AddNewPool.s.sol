// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "src/DEXFactory.sol";
import "lib/forge-std/src/console.sol";

/// @title Add New Pool Script
/// @notice Script for adding new trading pairs to existing DEX
contract AddNewPool is Script {
    // Update these addresses after initial deployment
    address constant FACTORY_ADDRESS = 0x1234567890123456789012345678901234567890; // Replace with actual factory address
    
    function run() external {
        vm.startBroadcast();
        
        DEXFactory factory = DEXFactory(FACTORY_ADDRESS);
        
        // Example: Add new token pairs
        // Replace these with actual token addresses you want to pair
        
        // Example 1: Add a new token called "NewToken" with USDK
        address newTokenAddress = 0xABCDEF123456789abcdeF123456789ABCDEf1234; // Replace with actual token
        address usdkAddress = 0x2e234DAe75C793f67A35089C9d99245E1C58470b;     // Update with actual USDK address
        
        console.log("Creating NewToken/USDK pool...");
        address newPool1 = factory.createPool(newTokenAddress, usdkAddress);
        console.log("NewToken/USDK pool created at:", newPool1);
        
        // Example 2: Add new token with Native coin
        console.log("Creating NewToken/Native pool...");
        address newPool2 = factory.createPool(newTokenAddress, address(0));
        console.log("NewToken/Native pool created at:", newPool2);
        
        // Example 3: Add two new tokens together
        address anotherTokenAddress = 0x9876543210987654321098765432109876543210; // Replace with actual token
        console.log("Creating NewToken/AnotherToken pool...");
        address newPool3 = factory.createPool(newTokenAddress, anotherTokenAddress);
        console.log("NewToken/AnotherToken pool created at:", newPool3);
        
        console.log("");
        console.log("=== New Pools Summary ===");
        console.log("Total pools now:", factory.allPoolsLength());
        console.log("New pools created this session: 3");
        
        vm.stopBroadcast();
    }
    
    /// @notice Helper function to add a specific pair
    function addSpecificPair(address tokenA, address tokenB) external {
        vm.startBroadcast();
        
        DEXFactory factory = DEXFactory(FACTORY_ADDRESS);
        
        console.log("Creating pool for tokens:");
        console.log("Token A:", tokenA);
        console.log("Token B:", tokenB);
        
        address newPool = factory.createPool(tokenA, tokenB);
        console.log("Pool created at:", newPool);
        
        vm.stopBroadcast();
    }
}
