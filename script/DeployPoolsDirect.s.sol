// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "src/AddLiquidity.sol";
import "src/Farming.sol";
import "lib/forge-std/src/console.sol";

/// @title Deploy Pools Direct (No Factory)
/// @notice Deploy pools directly with fee collection, bypassing factory size limit
contract DeployPoolsDirect is Script {
    // Existing token addresses
    address constant KANARI_TOKEN = 0x08ce40815dE4EbE10DbC06A71A967eF9D12e8645;
    address constant USDK_TOKEN = 0x8bd0eED7fBF4520F14FA70B35cDe45D83D4e13b6;
    
    function run() external {
        vm.startBroadcast();
        
        // Your dev wallet
        address devWallet = 0xC88C539aa6f67daeDaeA7aff75FE1F8848d6CeC2;
        
        console.log("=== Deploying Pools Direct with Fee Collection ===");
        console.log("Dev Wallet:", devWallet);
        console.log("");
        
        // Deploy KANARI/USDK pool
        ConstantProductAMM kanariUsdkPool = new ConstantProductAMM(KANARI_TOKEN, USDK_TOKEN);
        console.log("KANARI/USDK Pool deployed at:", address(kanariUsdkPool));
        
        // Setup fees for KANARI/USDK pool
        kanariUsdkPool.setFeeRecipient(devWallet);
        kanariUsdkPool.setDevFeeBps(10);  // 0.1%
        kanariUsdkPool.setFeeBps(30);     // 0.3%
        console.log("KANARI/USDK Pool fees configured");
        
        // Deploy KANARI/Native pool
        ConstantProductAMM kanariNativePool = new ConstantProductAMM(KANARI_TOKEN, address(0));
        console.log("KANARI/Native Pool deployed at:", address(kanariNativePool));
        
        // Setup fees for KANARI/Native pool
        kanariNativePool.setFeeRecipient(devWallet);
        kanariNativePool.setDevFeeBps(10);  // 0.1%
        kanariNativePool.setFeeBps(30);     // 0.3%
        console.log("KANARI/Native Pool fees configured");
        
        // Deploy USDK/Native pool
        ConstantProductAMM usdkNativePool = new ConstantProductAMM(USDK_TOKEN, address(0));
        console.log("USDK/Native Pool deployed at:", address(usdkNativePool));
        
        // Setup fees for USDK/Native pool
        usdkNativePool.setFeeRecipient(devWallet);
        usdkNativePool.setDevFeeBps(10);  // 0.1%
        usdkNativePool.setFeeBps(30);     // 0.3%
        console.log("USDK/Native Pool fees configured");
        
        // Deploy Farming contract
        Farming farming = new Farming(
            address(kanariUsdkPool),  // LP token address
            KANARI_TOKEN              // Reward token address
        );
        console.log("Farming contract deployed at:", address(farming));
        
        console.log("");
        console.log("=== NEW POOLS WITH FEE COLLECTION ===");
        console.log("KANARI/USDK Pool:", address(kanariUsdkPool));
        console.log("KANARI/Native Pool:", address(kanariNativePool));  
        console.log("USDK/Native Pool:", address(usdkNativePool));
        console.log("Farming Contract:", address(farming));
        console.log("Dev Wallet:", devWallet);
        console.log("");
        console.log("=== FEES CONFIGURED ===");
        console.log("Dev Fee: 0.1% (10 basis points)");
        console.log("Trading Fee: 0.3% (30 basis points)");
        console.log("");
        console.log("=== OLD POOLS (still functional, no fees) ===");
        console.log("Old KANARI/USDK: 0x9224A59e8CE52bd7A43dB38a7049CDdeAD535f63");
        console.log("Old KANARI/Native: 0x6852F22199064a6caa463372B43320cE9bA6970C");
        console.log("Old USDK/Native: 0x38DB72fA85823d17E4C878FF6901931EA16ca95b");
        
        vm.stopBroadcast();
    }
}
