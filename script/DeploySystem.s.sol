// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "lib/forge-std/src/Script.sol";
import "src/PoolManager.sol";
import "src/USDK.sol";
import "src/Kanari.sol";

contract DeploySystem is Script {
    function run() external {
        // When using --ledger, we don't need to get private key from env
        vm.startBroadcast();

        // Deploy tokens
        USDK usdk = new USDK();
        Kanari kanari = new Kanari();
        
        // Deploy pool manager
        PoolManager poolManager = new PoolManager();
        
        // Create USDK/KANARI pool
        bytes32 poolId = poolManager.addPool(address(usdk), address(kanari));
        
        // Set initial free value (example: 1000 USDK equivalent)
        poolManager.setFreeValue(poolId, 1000 * 10**6); // 1000 USDK (6 decimals)
        
        vm.stopBroadcast();
        
        // Log deployed addresses
        console.log("USDK deployed at:", address(usdk));
        console.log("Kanari deployed at:", address(kanari));
        console.log("PoolManager deployed at:", address(poolManager));
        console.log("Pool ID (USDK/KANARI):", vm.toString(poolId));
        
        // Log token info
        console.log("USDK total supply:", usdk.totalSupply());
        console.log("Kanari total supply:", kanari.totalSupply());
        console.log("Pool free value:", poolManager.freeValueOf(address(usdk), address(kanari)));
    }
}
