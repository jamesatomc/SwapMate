// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";

import "src/USDK.sol";
import "src/Kanari.sol";
import "src/AddLiquidity.sol";

/// @notice Script to deploy enhanced DEX system with swap functionality
contract DeployDEX is Script {
    function run() external {
        // When using --ledger, we don't need to get private key from env
        vm.startBroadcast();

        // Deploy tokens
        USDK usdk = new USDK();
        Kanari kanari = new Kanari();

        // Deploy pool
        KanariUsdkPool pool = new KanariUsdkPool(
            address(usdk),
            address(kanari)
        );

        vm.stopBroadcast();

        // Log deployed addresses
        console.log("=== DEX Deployment Complete ===");
        console.log("USDK deployed at:", address(usdk));
        console.log("Kanari deployed at:", address(kanari));
        console.log("Kanari-USDK SWAP Pool deployed at:", address(pool));

        // Log initial state
        console.log("\n=== Initial State ===");
        console.log("USDK total supply:", usdk.totalSupply());
        console.log("Kanari total supply:", kanari.totalSupply());

        console.log("\n=== Contract Addresses (Update in frontend) ===");
        console.log("USDK:", address(usdk));
        console.log("KANARI:", address(kanari));
        console.log("SWAP:", address(pool));
    }
}
