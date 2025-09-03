// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../lib/forge-std/src/Script.sol";
import "src/DEXFactory.sol";

contract DeployAdditionalPools is Script {
    // Configuration  
    address public constant DEX_FACTORY = 0x84d549dD7006c96C8559b4b373A7653AEC9cD67e;
    address public constant KANARI_TOKEN = 0x70C79817a33b764BC04F1c423C61d484fAE38624;
    address public constant USDC_TOKEN = 0xcC11f370fe6126b36D634FC1D2CCbC1F72599199;
    address public constant NATIVE_TOKEN = 0x0000000000000000000000000000000000000000; // sBTC (native)
    
    function run() external {
        vm.startBroadcast();
        
        console.log("=== Deploying Additional Pools ===");
        console.log("DEX Factory:", DEX_FACTORY);
        console.log("KANARI Token:", KANARI_TOKEN);
        console.log("USDC Token:", USDC_TOKEN);
        console.log("Native sBTC:", NATIVE_TOKEN);
        
        DEXFactory factory = DEXFactory(DEX_FACTORY);
        
        // Create KANARI/sBTC pool
        console.log("\n--- Creating KANARI/sBTC Pool ---");
        address kanariNativePool = factory.createPool(KANARI_TOKEN, NATIVE_TOKEN);
        console.log("KANARI/sBTC pool created at:", kanariNativePool);
        
        // Create USDC/sBTC pool
        console.log("\n--- Creating USDC/sBTC Pool ---");
        address usdcNativePool = factory.createPool(USDC_TOKEN, NATIVE_TOKEN);
        console.log("USDC/sBTC pool created at:", usdcNativePool);
        
        console.log("\n=== Pool Creation Summary ===");
        console.log("KANARI/sBTC Pool:", kanariNativePool);
        console.log("USDC/sBTC Pool:", usdcNativePool);
        console.log("Total pools:", factory.allPoolsLength());
        console.log("=== Deployment Complete ===");
        
        vm.stopBroadcast();
    }
}
