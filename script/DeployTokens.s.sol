// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";

import "src/USDK.sol";
import "src/Kanari.sol";

contract DeployTokens is Script {
    function run() external {
        vm.startBroadcast();

        USDK usdk = new USDK();
        Kanari kanari = new Kanari();

        vm.stopBroadcast();

        console.log("=== Token Deployment Complete ===");
        console.log("USDK:", address(usdk));
        console.log("KANARI:", address(kanari));
    }
}
