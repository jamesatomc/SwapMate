// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "src/AddLiquidity.sol";
import "lib/forge-std/src/console.sol";

/// @title Manual Pool Deployment
/// @notice Simple script to deploy individual pools manually (without factory)
contract DeployNewPoolManual is Script {
    function run() external {
        vm.startBroadcast();
        
        // Example: Deploy a new KANARI/NewToken pool
        address kanariAddress = 0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f; // Update with actual KANARI address
        address newTokenAddress = 0xABCDEF123456789abcdeF123456789ABCDEf1234; // Replace with new token address
        
        // Deploy the pool
        ConstantProductAMM newPool = new ConstantProductAMM(kanariAddress, newTokenAddress);
        console.log("New KANARI/NewToken pool deployed at:", address(newPool));
        
        // Set up fees and dev wallet
        address devWallet = 0xC88C539aa6f67daeDaeA7aff75FE1F8848d6CeC2; // Your dev wallet
        newPool.setFeeRecipient(devWallet);
        newPool.setDevFeeBps(10); // 0.1% dev fee
        newPool.setFeeBps(30);    // 0.3% trading fee
        
        console.log("Pool configured with:");
        console.log("- Dev wallet:", devWallet);
        console.log("- Dev fee: 0.1%");
        console.log("- Trading fee: 0.3%");
        
        vm.stopBroadcast();
    }
    
    /// @notice Deploy a pool between any two tokens
    function deployCustomPool(address tokenA, address tokenB) external {
        vm.startBroadcast();
        
        ConstantProductAMM newPool = new ConstantProductAMM(tokenA, tokenB);
        console.log("New pool deployed at:", address(newPool));
        console.log("Token A:", tokenA);
        console.log("Token B:", tokenB);
        
        vm.stopBroadcast();
    }
}
