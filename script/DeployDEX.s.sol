// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "lib/forge-std/src/Script.sol";
import "src/PoolManager.sol";
import "src/USDK.sol";
import "src/Kanari.sol";

/// @notice Script to deploy enhanced DEX system with swap functionality
contract DeployDEX is Script {
    function run() external {
        // When using --ledger, we don't need to get private key from env
        vm.startBroadcast();

        // Deploy tokens
        USDK usdk = new USDK();
        Kanari kanari = new Kanari();
        
        // Deploy enhanced pool manager with swap functionality
        PoolManager poolManager = new PoolManager();
        
        // Create USDK/KANARI pool
        bytes32 poolId = poolManager.addPool(address(usdk), address(kanari));
        
        // Set initial free value (example: 1000 USDK equivalent)
        poolManager.setFreeValue(poolId, 1000 * 10**6); // 1000 USDK (6 decimals)
        
        // Add initial liquidity (as pool creator)
        uint256 initialUSDK = 10000 * 10**6; // 10k USDK
        uint256 initialKANARI = 10000 * 10**18; // 10k KANARI
        
        // Approve tokens for pool manager
        usdk.approve(address(poolManager), initialUSDK);
        kanari.approve(address(poolManager), initialKANARI);
        
        // Add initial liquidity
        poolManager.addLiquidity(poolId, initialUSDK, initialKANARI);
        
        vm.stopBroadcast();
        
        // Log deployed addresses
        console.log("=== DEX Deployment Complete ===");
        console.log("USDK deployed at:", address(usdk));
        console.log("Kanari deployed at:", address(kanari));
        console.log("PoolManager deployed at:", address(poolManager));
        console.log("Pool ID (USDK/KANARI):", vm.toString(poolId));
        
        // Log initial state
        console.log("\n=== Initial State ===");
        console.log("USDK total supply:", usdk.totalSupply());
        console.log("Kanari total supply:", kanari.totalSupply());
        console.log("Pool free value:", poolManager.freeValueOf(address(usdk), address(kanari)));
        
        // Get reserves
        (uint256 reserveA, uint256 reserveB) = poolManager.getReserves(poolId);
        console.log("Pool USDK reserve:", reserveA);
        console.log("Pool KANARI reserve:", reserveB);
        
        console.log("\n=== Contract Addresses (Update in frontend) ===");
        console.log("USDK:", address(usdk));
        console.log("KANARI:", address(kanari));
        console.log("POOL_MANAGER:", address(poolManager));
        console.log("POOL_ID:", vm.toString(poolId));
    }
}
