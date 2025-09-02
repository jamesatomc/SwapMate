// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "src/AddLiquidity.sol";
import "src/Kanari.sol";
import "src/USDK.sol";
import "lib/forge-std/src/console.sol";

contract DeployDEX is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy USDK token
        USDK usdk = new USDK();
        console.log("USDK deployed at:", address(usdk));

        // Deploy KANARI token
        Kanari kanari = new Kanari();
        console.log("KANARI deployed at:", address(kanari));

        // Deploy DEX (AMM) with USDK and KANARI
        ConstantProductAMM dex = new ConstantProductAMM(address(usdk), address(kanari));
        console.log("DEX deployed at:", address(dex));

        vm.stopBroadcast();
    }
}


