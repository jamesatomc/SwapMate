// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "src/DEXFactory.sol";
import "lib/forge-std/src/console.sol";

/// @title Add New Pool via Factory
/// @notice Add new trading pairs using the factory
contract AddNewPoolViaFactory is Script {
    // Factory address (will be set after deployment)
    address constant FACTORY_ADDRESS = address(0); // Update after deploying factory
    
    // Existing token addresses
    address constant KANARI_TOKEN = 0x08ce40815dE4EbE10DbC06A71A967eF9D12e8645;
    address constant USDK_TOKEN = 0x8bd0eED7fBF4520F14FA70B35cDe45D83D4e13b6;
    
    function run() external {
        require(FACTORY_ADDRESS != address(0), "Update FACTORY_ADDRESS first");
        
        vm.startBroadcast();
        
        DEXFactory factory = DEXFactory(FACTORY_ADDRESS);
        
        // Example: Add new token pairs
        // Replace with actual new token addresses
        address newTokenA = 0xABCDEF123456789abcdeF123456789ABCDEf1234; // Replace with real token
        address newTokenB = 0x9876543210987654321098765432109876543210; // Replace with real token
        
        console.log("Creating new pools...");
        
        // Create NewTokenA/KANARI pool
        address pool1 = factory.createPool(newTokenA, KANARI_TOKEN);
        console.log("NewTokenA/KANARI pool:", pool1);
        
        // Create NewTokenA/USDK pool
        address pool2 = factory.createPool(newTokenA, USDK_TOKEN);
        console.log("NewTokenA/USDK pool:", pool2);
        
        // Create NewTokenB/KANARI pool
        address pool3 = factory.createPool(newTokenB, KANARI_TOKEN);
        console.log("NewTokenB/KANARI pool:", pool3);
        
        console.log("");
        console.log("Total pools in factory:", factory.allPoolsLength());
        
        vm.stopBroadcast();
    }
    
    /// @notice Create a specific pool pair
    function createSpecificPool(address tokenA, address tokenB) external {
        require(FACTORY_ADDRESS != address(0), "Update FACTORY_ADDRESS first");
        
        vm.startBroadcast();
        
        DEXFactory factory = DEXFactory(FACTORY_ADDRESS);
        address newPool = factory.createPool(tokenA, tokenB);
        
        console.log("New pool created at:", newPool);
        console.log("Token A:", tokenA);
        console.log("Token B:", tokenB);
        
        vm.stopBroadcast();
    }
}
