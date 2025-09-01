// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "lib/forge-std/src/Script.sol";

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
    
        
        vm.stopBroadcast();
        
        // Log deployed addresses
        console.log("=== DEX Deployment Complete ===");
        console.log("USDK deployed at:", address(usdk));
        console.log("Kanari deployed at:", address(kanari));

        
        // Log initial state
        console.log("\n=== Initial State ===");
        console.log("USDK total supply:", usdk.totalSupply());
        console.log("Kanari total supply:", kanari.totalSupply());
       
        
        console.log("\n=== Contract Addresses (Update in frontend) ===");
        console.log("USDK:", address(usdk));
        console.log("KANARI:", address(kanari));

    }
}
