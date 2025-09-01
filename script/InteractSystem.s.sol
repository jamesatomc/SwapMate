// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "lib/forge-std/src/Script.sol";
import "src/PoolManager.sol";
import "src/USDK.sol";
import "src/Kanari.sol";

/// @notice Script to interact with deployed tokens and pool system
contract InteractSystem is Script {
    // Replace these with actual deployed addresses
    address constant USDK_ADDRESS = address(0); // Update after deployment
    address constant KANARI_ADDRESS = address(0); // Update after deployment  
    address constant POOL_MANAGER_ADDRESS = address(0); // Update after deployment
    
    function run() external {
        // When using --ledger, we don't need to get private key from env
        vm.startBroadcast();
        
        // If addresses are not set, deploy new contracts
        USDK usdk;
        Kanari kanari;
        PoolManager poolManager;
        
        if (USDK_ADDRESS == address(0)) {
            console.log("Deploying new contracts...");
            usdk = new USDK();
            kanari = new Kanari();
            poolManager = new PoolManager();
            
            console.log("USDK deployed at:", address(usdk));
            console.log("Kanari deployed at:", address(kanari));
            console.log("PoolManager deployed at:", address(poolManager));
        } else {
            usdk = USDK(USDK_ADDRESS);
            kanari = Kanari(KANARI_ADDRESS);
            poolManager = PoolManager(POOL_MANAGER_ADDRESS);
        }
        
        // Create pool if it doesn't exist
        bytes32 poolId = poolManager.poolIdFor(address(usdk), address(kanari));
        (, , , bool exists) = poolManager.getPool(poolId);
        
        if (!exists) {
            console.log("Creating USDK/KANARI pool...");
            poolId = poolManager.addPool(address(usdk), address(kanari));
            console.log("Pool created with ID:", vm.toString(poolId));
        }
        
        // Set free value
        console.log("Setting free value to 2000 USDK...");
        poolManager.setFreeValue(poolId, 2000 * 10**6); // 2000 USDK
        
        // Demonstrate token operations
        address recipient = 0x1234567890123456789012345678901234567890;
        
        console.log("Minting 5000 USDK to recipient...");
        usdk.mint(recipient, 5000 * 10**6);
        
        console.log("Minting 10000 KANARI to recipient...");
        kanari.mint(recipient, 10000 * 10**18);
        
        vm.stopBroadcast();
        
        // Display final state
        console.log("\n=== Final State ===");
        console.log("Pool free value:", poolManager.freeValueOf(address(usdk), address(kanari)));
        console.log("USDK total supply:", usdk.totalSupply());
        console.log("Kanari total supply:", kanari.totalSupply());
        console.log("Recipient USDK balance:", usdk.balanceOf(recipient));
        console.log("Recipient KANARI balance:", kanari.balanceOf(recipient));
    }
}
