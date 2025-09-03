// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "src/AddLiquidity.sol";
import "src/DEXFactory.sol";
import "src/Farming.sol";
import "lib/forge-std/src/console.sol";

/// @title Deploy New Pools with Fee Collection
/// @notice Deploy new pools with fee collection using existing tokens
contract DeployNewPoolsWithFees is Script {
    // Existing token addresses from your previous deployment
    address constant KANARI_TOKEN = 0x08ce40815dE4EbE10DbC06A71A967eF9D12e8645;
    address constant USDK_TOKEN = 0x8bd0eED7fBF4520F14FA70B35cDe45D83D4e13b6;
    
    function run() external {
        vm.startBroadcast();
        
        // Your dev wallet
        address devWallet = 0xC88C539aa6f67daeDaeA7aff75FE1F8848d6CeC2;
        
        console.log("=== Deploying New Pools with Fee Collection ===");
        console.log("Using existing tokens:");
        console.log("KANARI:", KANARI_TOKEN);
        console.log("USDK:", USDK_TOKEN);
        console.log("Dev Wallet:", devWallet);
        console.log("");
        
        // Deploy Factory
        DEXFactory factory = new DEXFactory(devWallet);
        console.log("DEX Factory deployed at:", address(factory));
        
        // Create new pools with fee collection through factory
        address newKanariUsdkPool = factory.createPool(KANARI_TOKEN, USDK_TOKEN);
        console.log("New KANARI/USDK Pool:", newKanariUsdkPool);
        
        address newKanariNativePool = factory.createPool(KANARI_TOKEN, address(0));
        console.log("New KANARI/Native Pool:", newKanariNativePool);
        
        address newUsdkNativePool = factory.createPool(USDK_TOKEN, address(0));
        console.log("New USDK/Native Pool:", newUsdkNativePool);
        
        // Deploy Farming contract for new KANARI/USDK LP
        Farming farming = new Farming(
            newKanariUsdkPool,  // LP token address
            KANARI_TOKEN        // Reward token address
        );
        console.log("Farming contract deployed at:", address(farming));
        
        console.log("");
        console.log("=== NEW DEPLOYMENT SUMMARY ===");
        console.log("Factory:", address(factory));
        console.log("New KANARI/USDK Pool:", newKanariUsdkPool);
        console.log("New KANARI/Native Pool:", newKanariNativePool);  
        console.log("New USDK/Native Pool:", newUsdkNativePool);
        console.log("Farming Contract:", address(farming));
        console.log("Dev Wallet (Fee Recipient):", devWallet);
        console.log("");
        console.log("=== IMPORTANT NOTES ===");
        console.log("- These are NEW pools with fee collection enabled");
        console.log("- Old pools will continue to work but without fees");
        console.log("- You can migrate liquidity from old to new pools");
        console.log("- Dev fee: 0.1%, Trading fee: 0.3%");
        console.log("");
        console.log("=== OLD POOLS (still functional) ===");
        console.log("Old KANARI/USDK Pool: 0x9224A59e8CE52bd7A43dB38a7049CDdeAD535f63");
        console.log("Old KANARI/Native Pool: 0x6852F22199064a6caa463372B43320cE9bA6970C");
        console.log("Old USDK/Native Pool: 0x38DB72fA85823d17E4C878FF6901931EA16ca95b");
        
        vm.stopBroadcast();
    }
}
