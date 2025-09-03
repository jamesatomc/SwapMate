// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "src/AddLiquidity.sol";
import "lib/forge-std/src/console.sol";

/// @title Migration Helper
/// @notice Help users understand migration from old to new pools
contract MigrationHelper is Script {
    // Old pool addresses (no fee collection)
    address constant OLD_KANARI_USDK = 0x9224A59e8CE52bd7A43dB38a7049CDdeAD535f63;
    address constant OLD_KANARI_NATIVE = 0x6852F22199064a6caa463372B43320cE9bA6970C;
    address constant OLD_USDK_NATIVE = 0x38DB72fA85823d17E4C878FF6901931EA16ca95b;
    
    // Token addresses
    address constant KANARI_TOKEN = 0x08ce40815dE4EbE10DbC06A71A967eF9D12e8645;
    address constant USDK_TOKEN = 0x8bd0eED7fBF4520F14FA70B35cDe45D83D4e13b6;
    
    function run() external view {
        console.log("=== MIGRATION INFORMATION ===");
        console.log("");
        console.log("OLD POOLS (no fee collection):");
        console.log("- KANARI/USDK:", OLD_KANARI_USDK);
        console.log("- KANARI/Native:", OLD_KANARI_NATIVE);
        console.log("- USDK/Native:", OLD_USDK_NATIVE);
        console.log("");
        console.log("NEW POOLS (with fee collection):");
        console.log("- Will be created when you run DeployNewPoolsWithFees.s.sol");
        console.log("");
        console.log("MIGRATION STEPS:");
        console.log("1. Remove liquidity from old pools");
        console.log("2. Add liquidity to new pools");
        console.log("3. Update frontend to use new pool addresses");
        console.log("");
        console.log("BENEFITS OF NEW POOLS:");
        console.log("- Dev fee collection (0.1%)");
        console.log("- Better fee management");
        console.log("- Factory system for future expansion");
        console.log("- LP farming capabilities");
        
        // Check current liquidity in old pools
        checkOldPoolLiquidity();
    }
    
    function checkOldPoolLiquidity() internal view {
        console.log("");
        console.log("=== CURRENT LIQUIDITY IN OLD POOLS ===");
        
        // Check KANARI/USDK pool
        ConstantProductAMM kanariUsdkPool = ConstantProductAMM(payable(OLD_KANARI_USDK));
        (uint256 kanariReserve, uint256 usdkReserve) = kanariUsdkPool.getReserves();
        console.log("KANARI/USDK Pool:");
        console.log("- KANARI reserve:", kanariReserve);
        console.log("- USDK reserve:", usdkReserve);
        console.log("- Total LP supply:", kanariUsdkPool.totalSupply());
        console.log("");
    }
}
