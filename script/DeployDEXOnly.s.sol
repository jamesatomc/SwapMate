// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "src/AddLiquidity.sol";
import "src/Kanari.sol";
import "src/USDK.sol";
import "lib/forge-std/src/console.sol";

contract DeployDEXOnly is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy USDK token
        USDK usdk = new USDK();
        console.log("USDK deployed at:", address(usdk));

        // Deploy KANARI token
        Kanari kanari = new Kanari();
        console.log("KANARI deployed at:", address(kanari));

        // Deploy DEX pools
        // 1. KANARI/USDK pair
        ConstantProductAMM kanariUsdkDex = new ConstantProductAMM(address(kanari), address(usdk));
        console.log("KANARI/USDK DEX deployed at:", address(kanariUsdkDex));

        // 2. KANARI/Native coin pair (address(0) represents native coin)
        ConstantProductAMM kanariNativeDex = new ConstantProductAMM(address(kanari), address(0));
        console.log("KANARI/Native DEX deployed at:", address(kanariNativeDex));

        // 3. USDK/Native coin pair
        ConstantProductAMM usdkNativeDex = new ConstantProductAMM(address(usdk), address(0));
        console.log("USDK/Native DEX deployed at:", address(usdkNativeDex));

        // Mint some initial tokens for testing (optional)
        uint256 kanariAmount = 10000 * 10**18; // 10,000 KANARI
        uint256 usdkAmount = 10000 * 10**6;    // 10,000 USDK (6 decimals)
        
        kanari.mint(msg.sender, kanariAmount);
        usdk.mint(msg.sender, usdkAmount);

        console.log("=== Deployment Summary ===");
        console.log("USDK Token:", address(usdk));
        console.log("KANARI Token:", address(kanari));
        console.log("KANARI/USDK Pool:", address(kanariUsdkDex));
        console.log("KANARI/Native Pool:", address(kanariNativeDex));
        console.log("USDK/Native Pool:", address(usdkNativeDex));
        console.log("Deployer Address:", msg.sender);
        console.log("Minted 10,000 KANARI and 10,000 USDK to deployer");

        vm.stopBroadcast();
    }
}
