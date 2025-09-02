// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "src/AddLiquidity.sol";
import "src/Kanari.sol";
import "src/USDK.sol";
import "lib/forge-std/src/console.sol";

/// @title AddLiquidityHelper - Helper script for adding liquidity to existing pools
/// @notice Use this script to add liquidity to deployed DEX pools
contract AddLiquidityHelper is Script {
    
    // Replace these addresses with your deployed contract addresses
    address constant KANARI_TOKEN = 0x0000000000000000000000000000000000000000; // Update after deployment
    address constant USDK_TOKEN = 0x0000000000000000000000000000000000000000;   // Update after deployment
    address constant KANARI_USDK_POOL = 0x0000000000000000000000000000000000000000; // Update after deployment
    address constant KANARI_NATIVE_POOL = 0x0000000000000000000000000000000000000000; // Update after deployment
    address constant USDK_NATIVE_POOL = 0x0000000000000000000000000000000000000000;   // Update after deployment
    
    function run() external {
        vm.startBroadcast();
        
        // Get contract instances
        Kanari kanari = Kanari(KANARI_TOKEN);
        USDK usdk = USDK(USDK_TOKEN);
        ConstantProductAMM kanariUsdkPool = ConstantProductAMM(payable(KANARI_USDK_POOL));
        ConstantProductAMM kanariNativePool = ConstantProductAMM(payable(KANARI_NATIVE_POOL));
        ConstantProductAMM usdkNativePool = ConstantProductAMM(payable(USDK_NATIVE_POOL));
        
        // Define liquidity amounts
        uint256 kanariAmount = 500 * 10**18; // 500 KANARI
        uint256 usdkAmount = 500 * 10**6;    // 500 USDK
        uint256 nativeAmount = 0.5 ether;    // 0.5 native coin
        
        console.log("=== Adding Additional Liquidity ===");
        
        // Mint additional tokens if needed
        kanari.mint(msg.sender, kanariAmount * 2);
        usdk.mint(msg.sender, usdkAmount * 2);
        
        // Add liquidity to KANARI/USDK pool
        addLiquidityToKanariUsdkPool(kanari, usdk, kanariUsdkPool, kanariAmount, usdkAmount);
        
        // Add liquidity to KANARI/Native pool  
        addLiquidityToKanariNativePool(kanari, kanariNativePool, kanariAmount, nativeAmount);
        
        // Add liquidity to USDK/Native pool
        addLiquidityToUsdkNativePool(usdk, usdkNativePool, usdkAmount, nativeAmount);
        
        console.log("=== Liquidity Addition Complete ===");
        
        vm.stopBroadcast();
    }
    
    function addLiquidityToKanariUsdkPool(
        Kanari kanari,
        USDK usdk,
        ConstantProductAMM pool,
        uint256 kanariAmount,
        uint256 usdkAmount
    ) internal {
        console.log("Adding liquidity to KANARI/USDK pool...");
        
        // Approve tokens
        kanari.approve(address(pool), kanariAmount);
        usdk.approve(address(pool), usdkAmount);
        
        // Add liquidity
        try pool.addLiquidity(
            kanariAmount,
            usdkAmount,
            0, // minAmountA
            0, // minAmountB
            block.timestamp + 300 // 5 minutes deadline
        ) {
            console.log("Successfully added KANARI/USDK liquidity");
            console.log("KANARI amount:", kanariAmount);
            console.log("USDK amount:", usdkAmount);
        } catch Error(string memory reason) {
            console.log("Failed to add KANARI/USDK liquidity:", reason);
        }
    }
    
    function addLiquidityToKanariNativePool(
        Kanari kanari,
        ConstantProductAMM pool,
        uint256 kanariAmount,
        uint256 nativeAmount
    ) internal {
        console.log("Adding liquidity to KANARI/Native pool...");
        
        // Approve KANARI tokens
        kanari.approve(address(pool), kanariAmount);
        
        // Add liquidity (send native coin as msg.value)
        try pool.addLiquidity{value: nativeAmount}(
            kanariAmount,
            nativeAmount,
            0, // minAmountA
            0, // minAmountB
            block.timestamp + 300 // 5 minutes deadline
        ) {
            console.log("Successfully added KANARI/Native liquidity");
            console.log("KANARI amount:", kanariAmount);
            console.log("Native amount:", nativeAmount);
        } catch Error(string memory reason) {
            console.log("Failed to add KANARI/Native liquidity:", reason);
        }
    }
    
    function addLiquidityToUsdkNativePool(
        USDK usdk,
        ConstantProductAMM pool,
        uint256 usdkAmount,
        uint256 nativeAmount
    ) internal {
        console.log("Adding liquidity to USDK/Native pool...");
        
        // Approve USDK tokens
        usdk.approve(address(pool), usdkAmount);
        
        // Add liquidity (send native coin as msg.value)
        try pool.addLiquidity{value: nativeAmount}(
            usdkAmount,
            nativeAmount,
            0, // minAmountA
            0, // minAmountB
            block.timestamp + 300 // 5 minutes deadline
        ) {
            console.log("Successfully added USDK/Native liquidity");
            console.log("USDK amount:", usdkAmount);
            console.log("Native amount:", nativeAmount);
        } catch Error(string memory reason) {
            console.log("Failed to add USDK/Native liquidity:", reason);
        }
    }
    
    /// @notice Get pool reserves and LP token balance
    function getPoolInfo() external view {
        if (KANARI_USDK_POOL != address(0)) {
            ConstantProductAMM pool = ConstantProductAMM(payable(KANARI_USDK_POOL));
            (uint256 reserveA, uint256 reserveB) = pool.getReserves();
            console.log("KANARI/USDK Pool Reserves:");
            console.log("KANARI reserve:", reserveA);
            console.log("USDK reserve:", reserveB);
            console.log("LP token supply:", pool.totalSupply());
            console.log("---");
        }
        
        if (KANARI_NATIVE_POOL != address(0)) {
            ConstantProductAMM pool = ConstantProductAMM(payable(KANARI_NATIVE_POOL));
            (uint256 reserveA, uint256 reserveB) = pool.getReserves();
            console.log("KANARI/Native Pool Reserves:");
            console.log("KANARI reserve:", reserveA);
            console.log("Native reserve:", reserveB);
            console.log("LP token supply:", pool.totalSupply());
            console.log("---");
        }
        
        if (USDK_NATIVE_POOL != address(0)) {
            ConstantProductAMM pool = ConstantProductAMM(payable(USDK_NATIVE_POOL));
            (uint256 reserveA, uint256 reserveB) = pool.getReserves();
            console.log("USDK/Native Pool Reserves:");
            console.log("USDK reserve:", reserveA);
            console.log("Native reserve:", reserveB);
            console.log("LP token supply:", pool.totalSupply());
        }
    }
}
