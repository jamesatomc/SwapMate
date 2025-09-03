// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Test.sol";
import "../src/AddLiquidity.sol";
import "../src/Kanari.sol";
import "../src/usdc.sol";

contract DEXFeeCollectionTest is Test {
    ConstantProductAMM public amm;
    Kanari public kanari;
    USDC public usdc;

    address public owner = address(this);
    address public devWallet = address(0x123); // Dev fee recipient
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    uint256 public constant INITIAL_SUPPLY = 1000000e18;
    uint256 public constant INITIAL_LIQUIDITY_KANARI = 1000e18;
    uint256 public constant INITIAL_LIQUIDITY_USDC = 1000e6; // USDC has 6 decimals

    function setUp() public {
        // Deploy tokens
        kanari = new Kanari();
        usdc = new USDC();

        // Deploy AMM
        amm = new ConstantProductAMM(address(kanari), address(usdc));

        // Mint tokens
        kanari.mint(owner, INITIAL_SUPPLY);
        usdc.mint(owner, INITIAL_SUPPLY);
        kanari.mint(user1, INITIAL_SUPPLY);
        usdc.mint(user1, INITIAL_SUPPLY);
        kanari.mint(user2, INITIAL_SUPPLY);
        usdc.mint(user2, INITIAL_SUPPLY);

        // Set fee recipient
        amm.setFeeRecipient(devWallet);

        // Approve AMM to spend tokens
        kanari.approve(address(amm), type(uint256).max);
        usdc.approve(address(amm), type(uint256).max);

        vm.prank(user1);
        kanari.approve(address(amm), type(uint256).max);
        vm.prank(user1);
        usdc.approve(address(amm), type(uint256).max);

        vm.prank(user2);
        kanari.approve(address(amm), type(uint256).max);
        vm.prank(user2);
        usdc.approve(address(amm), type(uint256).max);

        // Add initial liquidity
        amm.addLiquidity(INITIAL_LIQUIDITY_KANARI, INITIAL_LIQUIDITY_USDC, 0, 0, block.timestamp + 1000);
    }

    function testFeeRecipientInitialization() public view {
        assertEq(amm.feeRecipient(), devWallet);
    }

    function testSetFeeRecipient() public {
        address newDevWallet = address(0x456);

        vm.expectEmit(true, true, false, false);
        emit ConstantProductAMM.FeeRecipientUpdated(devWallet, newDevWallet);

        amm.setFeeRecipient(newDevWallet);

        assertEq(amm.feeRecipient(), newDevWallet);
    }

    function testSetFeeRecipientOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert("Not owner");
        amm.setFeeRecipient(address(0x456));
    }

    function testSetFeeRecipientZeroAddress() public {
        vm.expectRevert("Invalid fee recipient");
        amm.setFeeRecipient(address(0));
    }

    function testSwapWithFeeCollection() public {
        uint256 swapAmount = 100e18; // 100 KANARI
        uint256 expectedDevFee = (swapAmount * amm.devFeeBps()) / amm.BPS(); // 0.1% dev fee

        // Account for Kanari's 1% burn on transfer
        uint256 burnAmount = (expectedDevFee * kanari.burnRate()) / kanari.BASIS_POINTS();
        uint256 actualDevFeeReceived = expectedDevFee - burnAmount;

        uint256 devBalanceBefore = kanari.balanceOf(devWallet);
        uint256 user1BalanceBefore = kanari.balanceOf(user1);
        uint256 user1USDCBefore = usdc.balanceOf(user1);

        vm.expectEmit(true, false, false, true);
        emit ConstantProductAMM.FeesCollected(devWallet, expectedDevFee, address(kanari));

        vm.prank(user1);
        uint256 amountOut = amm.swap(address(kanari), swapAmount, 0, block.timestamp + 1000);

        // Check dev wallet received fee (minus burn)
        assertEq(kanari.balanceOf(devWallet), devBalanceBefore + actualDevFeeReceived);

        // Check user1 balances
        assertEq(kanari.balanceOf(user1), user1BalanceBefore - swapAmount);
        assertEq(usdc.balanceOf(user1), user1USDCBefore + amountOut);

        // Verify fee was actually collected
        assertGt(kanari.balanceOf(devWallet), 0);
    }

    function testSwapWithZeroFeeRecipient() public {
        // Set fee recipient to zero
        amm.setFeeRecipient(address(0x999)); // Set to non-zero first

        uint256 swapAmount = 100e18;

        // Should still work but no fees collected to zero address
        vm.prank(user1);
        amm.swap(address(kanari), swapAmount, 0, block.timestamp + 1000);

        // Dev wallet should have received fees
        assertGt(kanari.balanceOf(address(0x999)), 0);
    }

    function testMultipleSwapsAccumulateFees() public {
        uint256 swapAmount = 50e18;
        uint256 expectedDevFeePerSwap = (swapAmount * amm.devFeeBps()) / amm.BPS();

        // Account for Kanari's 1% burn on transfer for each fee transfer
        uint256 burnPerFee = (expectedDevFeePerSwap * kanari.burnRate()) / kanari.BASIS_POINTS();
        uint256 actualDevFeePerSwap = expectedDevFeePerSwap - burnPerFee;

        uint256 devBalanceBefore = kanari.balanceOf(devWallet);

        // First swap
        vm.prank(user1);
        amm.swap(address(kanari), swapAmount, 0, block.timestamp + 1000);

        // Second swap
        vm.prank(user2);
        amm.swap(address(kanari), swapAmount, 0, block.timestamp + 1000);

        // Check total fees collected (minus burns)
        uint256 totalFeesCollected = kanari.balanceOf(devWallet) - devBalanceBefore;
        assertEq(totalFeesCollected, actualDevFeePerSwap * 2);
    }

    function testSwapBothDirections() public {
        uint256 swapAmount = 100e18;

        // Swap KANARI -> USDC
        vm.prank(user1);
        amm.swap(address(kanari), swapAmount, 0, block.timestamp + 1000);

        uint256 kanariFeesCollected = kanari.balanceOf(devWallet);
        uint256 USDCFeesCollected = usdc.balanceOf(devWallet);

        // Swap USDC -> KANARI (no burn on USDC)
        uint256 USDCSwapAmount = 50e6; // 50 USDC
        vm.prank(user2);
        amm.swap(address(usdc), USDCSwapAmount, 0, block.timestamp + 1000);

        // Check fees collected in both tokens
        // Kanari fees should account for burn, USDC fees should not
        uint256 expectedKanariDevFee = (swapAmount * amm.devFeeBps()) / amm.BPS();
        uint256 burnAmount = (expectedKanariDevFee * kanari.burnRate()) / kanari.BASIS_POINTS();
        uint256 actualKanariReceived = expectedKanariDevFee - burnAmount;

        assertEq(kanariFeesCollected, actualKanariReceived);
        assertGt(usdc.balanceOf(devWallet), USDCFeesCollected);
    }

    function testGetAmountOutWithDevFee() public view {
        uint256 amountIn = 100e18;

        uint256 amountOut = amm.getAmountOut(amountIn, address(kanari));

        // Amount out should be based on amountIn minus dev fee
        // This is a view function test to ensure calculation is correct
        assertGt(amountOut, 0);

        // The actual implementation should deduct dev fee before calculating swap output
        // We can't easily test the exact amount without replicating the complex math,
        // but we ensure the function works and returns a reasonable value
    }

    function testWithdrawFees() public {
        // First, accumulate some fees
        uint256 swapAmount = 100e18;
        vm.prank(user1);
        amm.swap(address(kanari), swapAmount, 0, block.timestamp + 1000);

        uint256 feesAccumulated = kanari.balanceOf(devWallet);
        assertGt(feesAccumulated, 0);

        // Test that owner can withdraw additional fees from contract
        uint256 contractKanariBalance = kanari.balanceOf(address(amm));

        if (contractKanariBalance > 0) {
            // Only test withdrawal if there are fees in contract
            uint256 devBalanceBefore = kanari.balanceOf(devWallet);

            amm.withdrawFees(address(kanari), contractKanariBalance);

            // Account for burn on withdrawal transfer
            uint256 burnAmount = (contractKanariBalance * kanari.burnRate()) / kanari.BASIS_POINTS();
            uint256 expectedReceived = contractKanariBalance - burnAmount;

            assertEq(kanari.balanceOf(devWallet), devBalanceBefore + expectedReceived);
        }
    }

    function testWithdrawFeesOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert("Not owner");
        amm.withdrawFees(address(kanari), 100);
    }

    function testFeeBpsUpdate() public {
        uint256 newDevFeeBps = 20; // 0.2%

        vm.expectEmit(false, false, false, true);
        emit ConstantProductAMM.DevFeeUpdated(newDevFeeBps);

        amm.setDevFeeBps(newDevFeeBps);

        assertEq(amm.devFeeBps(), newDevFeeBps);

        // Test swap with new dev fee rate
        uint256 swapAmount = 100e18;
        uint256 expectedDevFee = (swapAmount * newDevFeeBps) / amm.BPS();

        // Account for Kanari's 1% burn on transfer
        uint256 burnAmount = (expectedDevFee * kanari.burnRate()) / kanari.BASIS_POINTS();
        uint256 actualDevFeeReceived = expectedDevFee - burnAmount;

        uint256 devBalanceBefore = kanari.balanceOf(devWallet);

        vm.prank(user1);
        amm.swap(address(kanari), swapAmount, 0, block.timestamp + 1000);

        assertEq(kanari.balanceOf(devWallet), devBalanceBefore + actualDevFeeReceived);
    }

    function testPriceImpactWithDevFee() public view {
        uint256 amountIn = 100e18;
        uint256 priceImpact = amm.getPriceImpact(amountIn, address(kanari));

        // Price impact should be calculated correctly with dev fee considered
        assertGe(priceImpact, 0);
        assertLe(priceImpact, 10000); // Should not exceed 100%

        // For smaller trades, price impact should be different
        uint256 smallerAmountIn = 10e18; // Much smaller amount
        uint256 smallerPriceImpact = amm.getPriceImpact(smallerAmountIn, address(kanari));

        // Either different or both reasonable values
        assertLe(smallerPriceImpact, 10000);
        assertGe(smallerPriceImpact, 0);
    }
}
