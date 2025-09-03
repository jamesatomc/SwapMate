// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "src/AddLiquidity.sol";
import "src/DEXFactory.sol";
import "src/Farming.sol";
import "src/Kanari.sol";
import "src/USDK.sol";
import "lib/forge-std/src/console.sol";

contract DeployDEX is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy tokens first
        USDK usdk = new USDK();
        console.log("USDK deployed at:", address(usdk));

        Kanari kanari = new Kanari();
        console.log("KANARI deployed at:", address(kanari));

        // Deploy DEX Factory with dev wallet as fee recipient
        address devWallet = 0xC88C539aa6f67daeDaeA7aff75FE1F8848d6CeC2; // Replace with your dev wallet
        DEXFactory factory = new DEXFactory(devWallet);
        console.log("DEX Factory deployed at:", address(factory));

        // Deploy initial pools through factory
        address kanariUsdkPool = factory.createPool(address(kanari), address(usdk));
        console.log("KANARI/USDK Pool created at:", kanariUsdkPool);

        address kanariNativePool = factory.createPool(address(kanari), address(0));
        console.log("KANARI/Native Pool created at:", kanariNativePool);

        address usdkNativePool = factory.createPool(address(usdk), address(0));
        console.log("USDK/Native Pool created at:", usdkNativePool);

        // Deploy Farming contract for KANARI/USDK LP tokens
        Farming farming = new Farming(
            kanariUsdkPool,  // LP token address
            address(kanari)  // Reward token address
        );
        console.log("Farming contract deployed at:", address(farming));

        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("USDK Token:", address(usdk));
        console.log("KANARI Token:", address(kanari));
        console.log("DEX Factory:", address(factory));
        console.log("KANARI/USDK Pool:", kanariUsdkPool);
        console.log("KANARI/Native Pool:", kanariNativePool);
        console.log("USDK/Native Pool:", usdkNativePool);
        console.log("Farming Contract:", address(farming));
        console.log("Fee Recipient (Dev Wallet):", devWallet);
        console.log("");
        console.log("=== Adding New Pools in Future ===");
        console.log("Use factory.createPool(tokenA, tokenB) to add new trading pairs");
        console.log("Factory Owner:", factory.owner());
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Mint tokens for testing:");
        console.log("   - kanari.mint(address, amount)");
        console.log("   - usdk.mint(address, amount)");
        console.log("2. Add liquidity to pools");
        console.log("3. Fund farming contract: farming.fundRewards(amount, duration)");
        console.log("4. Start trading and farming!");

        vm.stopBroadcast();
    }
}


