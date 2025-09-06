// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../lib/forge-std/src/Script.sol";
import "src/ConstantProductAMM.sol";
import "src/DEXFactory.sol";
import "src/Farming.sol";
import "src/Kanari.sol";
import "src/USDC.sol";

contract DeployDEX_v1 is Script {
    // Deployment addresses - will be set after deployment
    address public kanariToken;
    address public usdcToken;
    address public dexFactory;
    address public kanariUsdcPool;
    address public farmingContract;

    // Configuration
    address public constant FEE_RECIPIENT = 0xC88C539aa6f67daeDaeA7aff75FE1F8848d6CeC2; // Your address
    uint256 public constant INITIAL_KANARI_MINT = 1_000_000 * 10 ** 18; // 1M KANARI
    uint256 public constant INITIAL_USDC_MINT = 100_000 * 10 ** 6; // 100K USDC (6 decimals)

    function run() external {
        vm.startBroadcast();

        console.log("=== Starting DEX Deployment ===");
        console.log("Deployer address:", msg.sender);
        console.log("Fee recipient:", FEE_RECIPIENT);

        // 1. Deploy tokens
        deployTokens();

        // 2. Deploy DEX Factory
        deployDEXFactory();

        // 3. Create initial pool (KANARI/USDC)
        createInitialPool();

        // 4. Deploy farming contract for the pool
        deployFarming();

        // 5. Setup initial configurations
        setupConfigurations();

        console.log("=== Deployment Summary ===");
        console.log("KANARI Token:", kanariToken);
        console.log("USDC Token:", usdcToken);
        console.log("DEX Factory:", dexFactory);
        console.log("KANARI/USDC Pool:", kanariUsdcPool);
        console.log("Farming Contract:", farmingContract);
        console.log("=== Deployment Complete ===");

        vm.stopBroadcast();
    }

    function deployTokens() internal {
        console.log("\n--- Deploying Tokens ---");

        // Deploy KANARI token
        Kanari kanari = new Kanari();
        kanariToken = address(kanari);
        console.log("KANARI deployed at:", kanariToken);

        // Deploy USDC token
        USDC usdc = new USDC();
        usdcToken = address(usdc);
        console.log("USDC deployed at:", usdcToken);

        // Mint initial supply
        kanari.mint(msg.sender, INITIAL_KANARI_MINT);
        usdc.mint(msg.sender, INITIAL_USDC_MINT);

        console.log("Initial tokens minted to deployer");
        console.log("KANARI balance:", INITIAL_KANARI_MINT / 10 ** 18, "tokens");
        console.log("USDC balance:", INITIAL_USDC_MINT / 10 ** 6, "tokens");
    }

    function deployDEXFactory() internal {
        console.log("\n--- Deploying DEX Factory ---");

        DEXFactory factory = new DEXFactory(FEE_RECIPIENT);
        dexFactory = address(factory);
        console.log("DEX Factory deployed at:", dexFactory);
    }

    function createInitialPool() internal {
        console.log("\n--- Creating Initial Pool ---");

        DEXFactory factory = DEXFactory(dexFactory);
        kanariUsdcPool = factory.createPool(kanariToken, usdcToken);

        console.log("KANARI/USDC pool created at:", kanariUsdcPool);
        console.log("Pool count:", factory.allPoolsLength());
    }

    function deployFarming() internal {
        console.log("\n--- Deploying Farming Contract ---");

        Farming farming = new Farming(kanariUsdcPool, kanariToken);
        farmingContract = address(farming);

        console.log("Farming contract deployed at:", farmingContract);
        console.log("LP Token (pool):", kanariUsdcPool);
        console.log("Reward Token:", kanariToken);
    }

    function setupConfigurations() internal pure {
        console.log("\n--- Setting up Configurations ---");

        console.log("Basic deployment complete!");
        console.log("Note: Farming rewards need to be configured manually after deployment.");
        console.log("Use fundRewards(amount, duration) on the farming contract.");
    }
}
