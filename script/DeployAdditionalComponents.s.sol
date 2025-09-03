// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "src/DEXFactory.sol";
import "src/Farming.sol";
import "lib/forge-std/src/console.sol";

/// @title Deploy Additional Components
/// @notice Deploy Factory and Farming for existing DEX
contract DeployAdditionalComponents is Script {
    // Existing contract addresses
    address constant KANARI_TOKEN = 0x08ce40815dE4EbE10DbC06A71A967eF9D12e8645;
    address constant USDK_TOKEN = 0x8bd0eED7fBF4520F14FA70B35cDe45D83D4e13b6;
    address constant KANARI_USDK_POOL = 0x9224A59e8CE52bd7A43dB38a7049CDdeAD535f63;
    
    function run() external {
        vm.startBroadcast();
        
        // Your dev wallet - replace with actual address
        address devWallet = 0x123456789aBCdEF123456789aBCdef123456789A;
        
        // Deploy Factory for future pools
        DEXFactory factory = new DEXFactory(devWallet);
        console.log("DEX Factory deployed at:", address(factory));
        
        // Deploy Farming contract for KANARI/USDK LP tokens
        Farming farming = new Farming(
            KANARI_USDK_POOL,  // LP token address
            KANARI_TOKEN       // Reward token address
        );
        console.log("Farming contract deployed at:", address(farming));
        
        console.log("");
        console.log("=== Additional Components Deployed ===");
        console.log("Factory:", address(factory));
        console.log("Farming:", address(farming));
        console.log("Dev Wallet:", devWallet);
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Setup fee collection on existing pools");
        console.log("2. Fund farming contract with KANARI rewards");
        console.log("3. Use factory to create new pools in the future");
        
        vm.stopBroadcast();
    }
}
