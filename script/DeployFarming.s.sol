// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "../src/Farming.sol";
import "../src/Kanari.sol";
import "../src/AddLiquidity.sol";

/// @title Deploy Farming contracts for each DEX pool
/// @notice Deploys farming contracts for KANARI/USDK, KANARI/Native, and USDK/Native pools
contract DeployFarming is Script {
    
    function run() external {
        // Get private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        address deployer = vm.addr(deployerPrivateKey);
        
        // These addresses should match your deployed contracts
        // You can get them from DeployDEX.s.sol output
        address kanariToken = 0x08ce40815dE4EbE10DbC06A71A967eF9D12e8645;
        address usdkToken = 0x8bd0eED7fBF4520F14FA70B35cDe45D83D4e13b6;
        address kanariUsdkPool = 0x9224A59e8CE52bd7A43dB38a7049CDdeAD535f63;
        address kanariNativePool = 0x6852F22199064a6caa463372B43320cE9bA6970C;
        address usdkNativePool = 0x38DB72fA85823d17E4C878FF6901931EA16ca95b;
        
        console.log("Deploying Farming contracts...");
        console.log("Deployer:", deployer);
        
        // Deploy Farming contract for KANARI/USDK pool
        Farming kanariUsdkFarming = new Farming(kanariUsdkPool, kanariToken);
        console.log("KANARI/USDK Farming deployed at:", address(kanariUsdkFarming));
        
        // Deploy Farming contract for KANARI/Native pool  
        Farming kanariNativeFarming = new Farming(kanariNativePool, kanariToken);
        console.log("KANARI/Native Farming deployed at:", address(kanariNativeFarming));
        
        // Deploy Farming contract for USDK/Native pool
        Farming usdkNativeFarming = new Farming(usdkNativePool, kanariToken);
        console.log("USDK/Native Farming deployed at:", address(usdkNativeFarming));
        
        vm.stopBroadcast();
        
        console.log("=== Deployment Summary ===");
        console.log("KANARI Token:", kanariToken);
        console.log("USDK Token:", usdkToken);
        console.log("KANARI/USDK Pool:", kanariUsdkPool);
        console.log("KANARI/Native Pool:", kanariNativePool);
        console.log("USDK/Native Pool:", usdkNativePool);
        console.log("KANARI/USDK Farming:", address(kanariUsdkFarming));
        console.log("KANARI/Native Farming:", address(kanariNativeFarming));
        console.log("USDK/Native Farming:", address(usdkNativeFarming));
        
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Fund farming contracts with KANARI rewards:");
        console.log("   - kanariToken.approve(farmingAddress, rewardAmount)");
        console.log("   - farming.fundRewards(rewardAmount, duration)");
        console.log("");
        console.log("2. Users can now:");
        console.log("   - Add liquidity to pools");
        console.log("   - Stake LP tokens in farming contracts");
        console.log("   - Earn KANARI rewards!");
        console.log("");
        console.log("3. Example funding (for each farming contract):");
        console.log("   - Reward Amount: 1000 KANARI");
        console.log("   - Duration: 7 days (604800 seconds)");
    }
}

/// @title Deploy Farming with auto-funding
/// @notice Deploys farming contracts and automatically funds them with rewards
contract DeployAndFundFarming is Script {
    
    function run() external {
        // Get private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        address deployer = vm.addr(deployerPrivateKey);
        
        // Contract addresses (update these with your deployed addresses)
        address kanariToken = 0x08ce40815dE4EbE10DbC06A71A967eF9D12e8645;
        address kanariUsdkPool = 0x9224A59e8CE52bd7A43dB38a7049CDdeAD535f63;
        address kanariNativePool = 0x6852F22199064a6caa463372B43320cE9bA6970C;
        address usdkNativePool = 0x38DB72fA85823d17E4C878FF6901931EA16ca95b;
        
        // Reward configuration
        uint256 rewardAmount = 1000e18; // 1000 KANARI per pool
        uint256 rewardDuration = 7 days; // 1 week
        
        console.log("Deploying and funding Farming contracts...");
        console.log("Deployer:", deployer);
        console.log("Reward Amount per pool:", rewardAmount / 1e18, "KANARI");
        console.log("Reward Duration:", rewardDuration / 86400, "days");
        
        // Get KANARI token instance
        Kanari kanari = Kanari(kanariToken);
        
        // Deploy and fund KANARI/USDK farming
        Farming kanariUsdkFarming = new Farming(kanariUsdkPool, kanariToken);
        console.log("KANARI/USDK Farming deployed at:", address(kanariUsdkFarming));
        
        // Mint and fund rewards for KANARI/USDK
        kanari.mint(deployer, rewardAmount);
        kanari.approve(address(kanariUsdkFarming), rewardAmount);
        kanariUsdkFarming.fundRewards(rewardAmount, rewardDuration);
        console.log("KANARI/USDK Farming funded with", rewardAmount / 1e18, "KANARI");
        
        // Deploy and fund KANARI/Native farming
        Farming kanariNativeFarming = new Farming(kanariNativePool, kanariToken);
        console.log("KANARI/Native Farming deployed at:", address(kanariNativeFarming));
        
        kanari.mint(deployer, rewardAmount);
        kanari.approve(address(kanariNativeFarming), rewardAmount);
        kanariNativeFarming.fundRewards(rewardAmount, rewardDuration);
        console.log("KANARI/Native Farming funded with", rewardAmount / 1e18, "KANARI");
        
        // Deploy and fund USDK/Native farming
        Farming usdkNativeFarming = new Farming(usdkNativePool, kanariToken);
        console.log("USDK/Native Farming deployed at:", address(usdkNativeFarming));
        
        kanari.mint(deployer, rewardAmount);
        kanari.approve(address(usdkNativeFarming), rewardAmount);
        usdkNativeFarming.fundRewards(rewardAmount, rewardDuration);
        console.log("USDK/Native Farming funded with", rewardAmount / 1e18, "KANARI");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== Deployment & Funding Complete! ===");
        console.log("All farming contracts are now live and funded!");
        console.log("");
        console.log("Users can now:");
        console.log("1. Add liquidity to any pool");
        console.log("2. Stake LP tokens in corresponding farming contract");
        console.log("3. Earn KANARI rewards automatically!");
        console.log("");
        console.log("Farming Addresses:");
        console.log("- KANARI/USDK:", address(kanariUsdkFarming));
        console.log("- KANARI/Native:", address(kanariNativeFarming));
        console.log("- USDK/Native:", address(usdkNativeFarming));
    }
}
