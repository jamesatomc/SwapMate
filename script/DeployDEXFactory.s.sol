// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../lib/forge-std/src/Script.sol";
import "src/DEXFactory.sol";

contract DeployDEXFactory is Script {
    // Configuration
    address public constant FEE_RECIPIENT = 0xC88C539aa6f67daeDaeA7aff75FE1F8848d6CeC2; // Your address
    address public constant KANARI_TOKEN = 0x37321CDCa90a1A3251c0c1B7efe59E9373377ce2;
    address public constant USDC_TOKEN = 0xEaCd28D794297DEC3aAe30295bca7A93Db800bF0;

    function run() external {
        vm.startBroadcast();

        console.log("=== Deploying DEX Factory ===");
        console.log("Deployer address:", msg.sender);
        console.log("Fee recipient:", FEE_RECIPIENT);

        // Deploy DEX Factory
        DEXFactory factory = new DEXFactory(FEE_RECIPIENT);
        address dexFactory = address(factory);
        console.log("DEX Factory deployed at:", dexFactory);

        // Create initial pool (KANARI/USDC)
        address kanariUsdcPool = factory.createPool(KANARI_TOKEN, USDC_TOKEN);
        console.log("KANARI/USDC pool created at:", kanariUsdcPool);
        console.log("Pool count:", factory.allPoolsLength());

        console.log("=== Factory Deployment Summary ===");
        console.log("DEX Factory:", dexFactory);
        console.log("KANARI/USDC Pool:", kanariUsdcPool);
        console.log("=== Deployment Complete ===");

        vm.stopBroadcast();
    }
}
