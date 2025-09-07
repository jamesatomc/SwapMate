// SPDX-License-Identifier: MIT

//ระบบ farm คู่ kanari/coin(Native) จะได้ Reward 
// token kanari pool 6M token 
// Calculation formula (6M Kanari)/(6 years)/(365 days)/(24 hours)/(3600 sec)
// 0.0317098 
pragma solidity ^0.8.30;

import "../lib/forge-std/src/Script.sol";
import "src/ConstantProductAMM.sol";
import "src/DEXFactory.sol";
import "src/Farming.sol";

/// Token contract
import "src/Kanari.sol";
import "src/USDC.sol";

contract DeployDEX_v2 is Script {
	// Deployment addresses - will be set after deployment
	address public kanariToken;
	address public dexFactory;
	address public kanariNativePool;
	address public farmingContract;

	// Configuration
	address public constant FEE_RECIPIENT = 0xC88C539aa6f67daeDaeA7aff75FE1F8848d6CeC2; // Your address

	// Reward parameters
	// Total rewards: 6,000,000 KANARI (18 decimals)
	uint256 public constant TOTAL_REWARDS = 6_000_000 * 1e18; // 
	// Duration: 6 years (using 365 days/year)
	uint256 public constant DURATION_SECONDS = 6 * 365 * 24 * 3600; // 189,216,000 seconds

	// Initial mint so deployer can fund rewards and keep some tokens
	uint256 public constant INITIAL_KANARI_MINT = 6_000_000 * 1e18; // 
	function run() external {
		vm.startBroadcast();

		console.log("=== Starting DEX v2 Deployment ===");
		console.log("Deployer:", msg.sender);

		// 1. Deploy tokens
		deployTokens();

		// 2. Deploy DEX Factory
		deployDEXFactory();

		// 3. Create KANARI/native pool
		createKanariNativePool();

		// 4. Deploy Farming and fund with TOTAL_REWARDS over DURATION_SECONDS
		deployFarmingAndFund();

		console.log("=== Deployment Summary ===");
		console.log("KANARI Token:", kanariToken);
		console.log("DEX Factory:", dexFactory);
		console.log("KANARI/Native Pool:", kanariNativePool);
		console.log("Farming Contract:", farmingContract);

		vm.stopBroadcast();
	}

	function deployTokens() internal {
		console.log("\n--- Deploying Tokens ---");
		Kanari kanari = new Kanari();
		kanariToken = address(kanari);
		console.log("KANARI deployed at:", kanariToken);

		// Mint initial supply to deployer so they can fund rewards
		kanari.mint(msg.sender, INITIAL_KANARI_MINT);
		console.log("Minted", INITIAL_KANARI_MINT / 1e18, "KANARI to deployer"); // ✅ แสดงให้อ่านง่าย
	}

	function deployDEXFactory() internal {
		console.log("\n--- Deploying DEX Factory ---");
		DEXFactory factory = new DEXFactory(FEE_RECIPIENT);
		dexFactory = address(factory);
		console.log("DEX Factory deployed at:", dexFactory);
	}

	function createKanariNativePool() internal {
		console.log("\n--- Creating KANARI/Native Pool ---");
		DEXFactory factory = DEXFactory(dexFactory);
		// Use address(0) to indicate native chain coin
		kanariNativePool = factory.createPool(kanariToken, address(0));
		console.log("KANARI/Native pool created at:", kanariNativePool);
		console.log("Pool count:", factory.allPoolsLength());
	}

	function deployFarmingAndFund() internal {
		console.log("\n--- Deploying Farming Contract ---");
		Farming farming = new Farming(kanariNativePool, kanariToken);
		farmingContract = address(farming);
		console.log("Farming contract at:", farmingContract);

		// Approve and fund rewards: transfer TOTAL_REWARDS from deployer to farming contract
		console.log("Funding rewards:", TOTAL_REWARDS / 1e18, "KANARI"); // ✅ แสดงให้อ่านง่าย
		console.log("Duration (seconds):", DURATION_SECONDS);
		Kanari(kanariToken).approve(farmingContract, TOTAL_REWARDS);
		// call fundRewards as owner of the farming contract (we set owner to msg.sender in constructor)
		farming.fundRewards(TOTAL_REWARDS, DURATION_SECONDS);
		console.log("Rewards funded.");

		// Verification
		require(farming.getRewardRate() > 0, "Reward rate is zero");
		console.log("Reward rate (KANARI/sec):", farming.getRewardRate() / 1e18);
	}
}