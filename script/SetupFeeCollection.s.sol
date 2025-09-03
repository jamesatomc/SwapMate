// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "src/AddLiquidity.sol";
import "lib/forge-std/src/console.sol";

/// @title Setup Fee Collection for Existing Pools
/// @notice Add fee collection to already deployed pools
contract SetupFeeCollection is Script {
    // Contract addresses from your deployment
    address constant KANARI_USDK_POOL = 0x9224A59e8CE52bd7A43dB38a7049CDdeAD535f63;
    address constant KANARI_NATIVE_POOL = 0x6852F22199064a6caa463372B43320cE9bA6970C;
    address constant USDK_NATIVE_POOL = 0x38DB72fA85823d17E4C878FF6901931EA16ca95b;
    
    function run() external {
        vm.startBroadcast();
        
        // Your dev wallet address - replace with actual address
        address devWallet = 0xC88C539aa6f67daeDaeA7aff75FE1F8848d6CeC2;
        
        // Setup fee collection for all pools
        setupPoolFees(KANARI_USDK_POOL, devWallet);
        setupPoolFees(KANARI_NATIVE_POOL, devWallet);
        setupPoolFees(USDK_NATIVE_POOL, devWallet);
        
        console.log("=== Fee Collection Setup Complete ===");
        console.log("Dev wallet:", devWallet);
        console.log("Dev fee rate: 0.1% (10 basis points)");
        console.log("Trading fee rate: 0.3% (30 basis points)");
        
        vm.stopBroadcast();
    }
    
    function setupPoolFees(address poolAddress, address devWallet) internal {
        ConstantProductAMM pool = ConstantProductAMM(payable(poolAddress));
        
        console.log("Setting up fees for pool:", poolAddress);
        
        // Set fee recipient
        pool.setFeeRecipient(devWallet);
        
        // Set dev fee (0.1%)
        pool.setDevFeeBps(10);
        
        // Set trading fee (0.3%)
        pool.setFeeBps(30);
        
        console.log("Pool configured successfully");
    }
}
