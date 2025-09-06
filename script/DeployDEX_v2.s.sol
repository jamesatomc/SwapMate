// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title DeployDEXV2 - Complete DEX with Farming System
 * @notice Deploys a complete DEX ecosystem with 6-year farming rewards
 * 
 * FARMING SYSTEM SPECIFICATIONS:
 * - Pool: KANARI/Native (sBTC) liquidity pair
 * - Total Rewards: 6,000,000 KANARI tokens
 * - Duration: 6 years (2,190 days)
 * - Annual Distribution: 1,000,000 KANARI per year
 * - Reward Distribution: Proportional to LP token staking
 * - Reward Rate: Divided among all LP stakers
 * 
 * PROCESS:
 * 1. Users add liquidity to KANARI/Native pool → receive LP tokens
 * 2. Users stake LP tokens in farming contract
 * 3. Rewards are distributed continuously over 6 years
 * 4. More stakers = rewards split among more participants
 */

import "../lib/forge-std/src/Script.sol";
import "src/ConstantProductAMM.sol";
import "src/DEXFactory.sol";
import "src/Farming.sol";
import "src/Kanari.sol";

contract DeployDEX_v2 is Script {
    // Deployment addresses - will be set after deployment
    address public kanariToken;
    address public nativeToken = 0x0000000000000000000000000000000000000000; // sBTC (native)
    address public dexFactory;
    address public kanariNativePool;
    address payable public farmingContract;

    // Configuration
    address public constant NATIVE_TOKEN = 0x0000000000000000000000000000000000000000; // sBTC (native)
    address public constant FEE_RECIPIENT = 0xC88C539aa6f67daeDaeA7aff75FE1F8848d6CeC2; // Your address

    // Farming V2 Configuration
    uint256 public constant TOTAL_FARMING_REWARDS = 6_000_000 * 1e18; // 6 million KANARI
    uint256 public constant FARMING_DURATION = 6 * 365 * 24 * 60 * 60; // 6 years in seconds
    uint256 public constant YEARLY_REWARDS = 1_000_000 * 1e18; // 1 million KANARI per year

    function run() external {
        vm.startBroadcast();

        console.log("=== Starting DEX V2 Farming Deployment ===");
        console.log("Deployer address:", msg.sender);
        console.log("Fee recipient:", FEE_RECIPIENT);
        console.log("Total farming rewards:", TOTAL_FARMING_REWARDS / 1e18, "KANARI");
        console.log("Farming duration:", FARMING_DURATION / (365 * 24 * 60 * 60), "years");
        console.log("Yearly rewards:", YEARLY_REWARDS / 1e18, "KANARI per year");

        // 1. Deploy tokens
        deployTokens();

        // 2. Deploy DEX Factory
        deployDEXFactory();

        // 3. Create initial pool (KANARI/Native)
        createInitialPool();

        // 4. Deploy farming contract for the pool
        deployFarming();

        // 5. Setup farming V2 with 6-year reward schedule
        setupFarmingV2();

        console.log("=== Deployment Summary ===");
        console.log("KANARI Token:", kanariToken);
        console.log("DEX Factory:", dexFactory);
        console.log("KANARI/Native Pool:", kanariNativePool);
        console.log("Farming Contract:", farmingContract);
        console.log("Total Rewards Allocated:", TOTAL_FARMING_REWARDS / 1e18, "KANARI");
        console.log("=== Deployment Complete ===");

        vm.stopBroadcast();
    }

    function deployTokens() internal {
        console.log("\n--- Deploying Tokens ---");

        // Deploy KANARI token
        Kanari kanari = new Kanari();
        kanariToken = address(kanari);
        console.log("KANARI deployed at:", kanariToken);
        
        // Check initial supply
        uint256 totalSupply = kanari.totalSupply();
        console.log("KANARI total supply:", totalSupply / 1e18, "tokens");
        
        // Ensure we have enough tokens for farming rewards
        require(totalSupply >= TOTAL_FARMING_REWARDS, "Insufficient KANARI supply for farming");
    }

    function deployDEXFactory() internal {
        console.log("\n--- Deploying DEX Factory ---");

        DEXFactory factory = new DEXFactory(FEE_RECIPIENT);
        dexFactory = address(factory);
        console.log("DEX Factory deployed at:", dexFactory);
    }

    function createInitialPool() internal {
        console.log("\n--- Creating Initial Pool (KANARI/Native) ---");

        DEXFactory factory = DEXFactory(dexFactory);
        kanariNativePool = factory.createPool(kanariToken, nativeToken);

        console.log("KANARI/Native pool created at:", kanariNativePool);
        console.log("Pool count:", factory.allPoolsLength());
        console.log("This pool will be used for farming LP rewards");
    }

    function deployFarming() internal {
        console.log("\n--- Deploying Farming Contract V2 ---");

        Farming farming = new Farming(kanariNativePool, kanariToken);
        farmingContract = payable(address(farming));

        console.log("Farming contract deployed at:", farmingContract);
        console.log("LP Token (pool):", kanariNativePool);
        console.log("Reward Token:", kanariToken);
    }

    function setupFarmingV2() internal {
        console.log("\n--- Setting up Farming V2 (6-year schedule) ---");

        Kanari kanari = Kanari(kanariToken);
        Farming farming = Farming(farmingContract);

        // Approve farming contract to spend tokens for funding
        console.log("Approving", TOTAL_FARMING_REWARDS / 1e18, "KANARI for farming contract...");
        kanari.approve(farmingContract, TOTAL_FARMING_REWARDS);
        
        // Fund the farming contract with 6-year reward schedule
        farming.fundRewards(TOTAL_FARMING_REWARDS, FARMING_DURATION);
        
        console.log("Farming V2 setup complete!");
        console.log("- Total rewards:", TOTAL_FARMING_REWARDS / 1e18, "KANARI");
        console.log("- Duration:", FARMING_DURATION / (365 * 24 * 60 * 60), "years");
        console.log("- Reward rate per second:", farming.getRewardRate() / 1e18, "KANARI/sec");
        console.log("- Estimated rewards per year:", (farming.getRewardRate() * 365 * 24 * 60 * 60) / 1e18, "KANARI");
        
        console.log("\nFarming Instructions:");
        console.log("1. Add liquidity to KANARI/Native pool:", kanariNativePool);
        console.log("2. Stake LP tokens in farming contract:", farmingContract);
        console.log("3. Earn KANARI rewards proportional to your LP stake");
        console.log("4. Rewards are distributed over 6 years (1M KANARI per year)");
        console.log("5. More LP stakers = rewards split among more people");
    }

    // Helper function to verify farming setup
    function verifyFarmingSetup() external view returns (bool) {
        if (farmingContract == address(0)) return false;
        
        Farming farming = Farming(farmingContract);
        
        // Check if farming has been funded
        if (farming.getRewardRate() == 0) return false;
        if (farming.getPeriodFinish() == 0) return false;
        
        // Check duration is approximately 6 years (allow some tolerance)
        uint256 duration = farming.getPeriodFinish() - block.timestamp;
        uint256 sixYears = 6 * 365 * 24 * 60 * 60;
        
        return (duration >= sixYears - 3600 && duration <= sixYears + 3600); // 1 hour tolerance
    }

    // Helper function to get current farming stats
    function getFarmingStats() external view returns (
        uint256 rewardRate,
        uint256 periodFinish,
        uint256 totalStaked,
        uint256 remainingRewards
    ) {
        if (farmingContract == address(0)) {
            return (0, 0, 0, 0);
        }
        
        Farming farming = Farming(farmingContract);
        
        rewardRate = farming.getRewardRate();
        periodFinish = farming.getPeriodFinish();
        totalStaked = farming.totalSupply();
        remainingRewards = farming.getRewardForDuration();
    }

    // Helper function to estimate user rewards
    function estimateUserRewards(address user) external view returns (uint256 estimatedRewards) {
        if (farmingContract == address(0)) return 0;
        
        Farming farming = Farming(farmingContract);
        return farming.earned(user);
    }

    // Helper function to get farming contract addresses for frontend
    function getContractAddresses() external view returns (
        address kanari,
        address factory,
        address pool,
        address farming
    ) {
        return (kanariToken, dexFactory, kanariNativePool, farmingContract);
    }
}
