// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";
import "../src/Farming.sol";
import "../src/Kanari.sol";

/// @title Fund existing Farming contracts with rewards
/// @notice Helper script to add rewards to already deployed farming contracts
contract FundFarmingRewards is Script {
    
    function run() external {
        // Get private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        address deployer = vm.addr(deployerPrivateKey);
        
        // Update these addresses with your deployed farming contracts
        address kanariToken = 0x08ce40815dE4EbE10DbC06A71A967eF9D12e8645;
        address kanariUsdkFarming = address(0); // Update with deployed address
        address kanariNativeFarming = address(0); // Update with deployed address  
        address usdkNativeFarming = address(0); // Update with deployed address
        
        // Reward configuration
        uint256 rewardAmount = 2000e18; // 2000 KANARI per pool
        uint256 rewardDuration = 14 days; // 2 weeks
        
        console.log("Funding Farming contracts with additional rewards...");
        console.log("Deployer:", deployer);
        console.log("Reward Amount per pool:", rewardAmount / 1e18, "KANARI");
        console.log("Reward Duration:", rewardDuration / 86400, "days");
        
        // Get token instances
        Kanari kanari = Kanari(kanariToken);
        
        // Total rewards needed
        uint256 totalRewards = rewardAmount * 3; // 3 farming contracts
        
        // Mint total rewards needed
        kanari.mint(deployer, totalRewards);
        console.log("Minted", totalRewards / 1e18, "KANARI for rewards");
        
        // Fund KANARI/USDK farming (if address is set)
        if (kanariUsdkFarming != address(0)) {
            Farming farming1 = Farming(payable(kanariUsdkFarming));
            kanari.approve(address(farming1), rewardAmount);
            farming1.fundRewards(rewardAmount, rewardDuration);
            console.log("KANARI/USDK Farming funded:", rewardAmount / 1e18, "KANARI");
        } else {
            console.log("KANARI/USDK Farming address not set - skipping");
        }
        
        // Fund KANARI/Native farming (if address is set)
        if (kanariNativeFarming != address(0)) {
            Farming farming2 = Farming(payable(kanariNativeFarming));
            kanari.approve(address(farming2), rewardAmount);
            farming2.fundRewards(rewardAmount, rewardDuration);
            console.log("KANARI/Native Farming funded:", rewardAmount / 1e18, "KANARI");
        } else {
            console.log("KANARI/Native Farming address not set - skipping");
        }
        
        // Fund USDK/Native farming (if address is set)
        if (usdkNativeFarming != address(0)) {
            Farming farming3 = Farming(payable(usdkNativeFarming));
            kanari.approve(address(farming3), rewardAmount);
            farming3.fundRewards(rewardAmount, rewardDuration);
            console.log("USDK/Native Farming funded:", rewardAmount / 1e18, "KANARI");
        } else {
            console.log("USDK/Native Farming address not set - skipping");
        }
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== Funding Complete! ===");
        console.log("All specified farming contracts have been funded.");
        console.log("Users will continue earning rewards for the next", rewardDuration / 86400, "days!");
    }
}

/// @title Pause/Unpause Farming contracts in emergency
/// @notice Emergency script to pause or unpause farming contracts
contract EmergencyFarmingControl is Script {
    
    function run() external {
        // Get private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Update these addresses with your deployed farming contracts
        address[] memory farmingContracts = new address[](3);
        farmingContracts[0] = address(0); // KANARI/USDK Farming
        farmingContracts[1] = address(0); // KANARI/Native Farming
        farmingContracts[2] = address(0); // USDK/Native Farming
        
        // Set to true to pause, false to unpause
        bool shouldPause = true;
        
        console.log(shouldPause ? "Pausing" : "Unpausing", "farming contracts...");
        
        for (uint i = 0; i < farmingContracts.length; i++) {
            if (farmingContracts[i] != address(0)) {
                Farming farming = Farming(payable(farmingContracts[i]));
                
                if (shouldPause) {
                    if (!farming.paused()) {
                        farming.pause();
                        console.log("Paused farming contract:", farmingContracts[i]);
                    } else {
                        console.log("Already paused:", farmingContracts[i]);
                    }
                } else {
                    if (farming.paused()) {
                        farming.unpause();
                        console.log("Unpaused farming contract:", farmingContracts[i]);
                    } else {
                        console.log("Already unpaused:", farmingContracts[i]);
                    }
                }
            }
        }
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== Emergency Control Complete! ===");
        console.log(shouldPause ? "All contracts paused." : "All contracts unpaused.");
        if (shouldPause) {
            console.log("Users can still use emergencyWithdraw() to get their LP tokens back.");
        }
    }
}
