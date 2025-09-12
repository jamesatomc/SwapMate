// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Test.sol";
import "../src/Farming.sol";
import "../src/Kanari.sol";

// Mock LP Token for testing
contract MockLPToken {
    string public name = "Mock LP Token";
    string public symbol = "MLP";
    uint8 public decimals = 18;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address who) public view returns (uint256) {
        return _balances[who];
    }

    function allowance(address owner_, address spender) public view returns (uint256) {
        return _allowances[owner_][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = _allowances[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "ERC20: transfer amount exceeds allowance");
            _allowances[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(_balances[from] >= amount, "ERC20: transfer amount exceeds balance");
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function mint(address to, uint256 amount) external {
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(_balances[from] >= amount, "ERC20: burn amount exceeds balance");
        _balances[from] -= amount;
        _totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
}

contract FarmingTest is Test {
    Farming public farming;
    Kanari public rewardToken;
    MockLPToken public lpToken;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);

    uint256 public constant INITIAL_LP_AMOUNT = 1000e18;
    uint256 public constant REWARD_AMOUNT = 1000e18;
    uint256 public constant REWARD_DURATION = 7 days;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event RewardAdded(uint256 reward, uint256 duration);

    function setUp() public {
        // Deploy reward token (Kanari)
        rewardToken = new Kanari();

        // Deploy mock LP token
        lpToken = new MockLPToken();

        // Deploy farming contract
        farming = new Farming(address(lpToken), address(rewardToken));

        // Mint LP tokens for testing
        lpToken.mint(user1, INITIAL_LP_AMOUNT);
        lpToken.mint(user2, INITIAL_LP_AMOUNT);
        lpToken.mint(user3, INITIAL_LP_AMOUNT);

        // Mint reward tokens for farming
        rewardToken.mint(owner, REWARD_AMOUNT * 10);

        // Approve farming contract to spend reward tokens
        rewardToken.approve(address(farming), type(uint256).max);
    }

    function _approveLP(address user, uint256 amount) internal {
        vm.prank(user);
        lpToken.approve(address(farming), amount);
    }

    function testInitialState() public view {
        assertEq(address(farming.lpToken()), address(lpToken));
        assertEq(address(farming.rewardToken()), address(rewardToken));
        assertEq(farming.totalSupply(), 0);
        assertEq(farming.rewardRate(), 0);
        assertEq(farming.periodFinish(), 0);
        assertFalse(farming.paused());
    }

    function testStake() public {
        uint256 stakeAmount = 100e18;
        _approveLP(user1, stakeAmount);

        vm.expectEmit(true, false, false, true);
        emit Staked(user1, stakeAmount);

        vm.prank(user1);
        farming.stake(stakeAmount);

        assertEq(farming.balanceOf(user1), stakeAmount);
        assertEq(farming.totalSupply(), stakeAmount);
    }

    function testStakeZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert("Cannot stake 0");
        farming.stake(0);
    }

    function testStakeWhenPaused() public {
        farming.pause();

        uint256 stakeAmount = 100e18;
        _approveLP(user1, stakeAmount);

        vm.prank(user1);
        vm.expectRevert();
        farming.stake(stakeAmount);
    }

    function testWithdraw() public {
        uint256 stakeAmount = 100e18;
        _approveLP(user1, stakeAmount);

        vm.prank(user1);
        farming.stake(stakeAmount);

        uint256 withdrawAmount = 50e18;

        vm.expectEmit(true, false, false, true);
        emit Withdrawn(user1, withdrawAmount);

        vm.prank(user1);
        farming.withdraw(withdrawAmount);

        assertEq(farming.balanceOf(user1), stakeAmount - withdrawAmount);
        assertEq(farming.totalSupply(), stakeAmount - withdrawAmount);
    }

    function testWithdrawZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert("Cannot withdraw 0");
        farming.withdraw(0);
    }

    function testWithdrawInsufficientBalance() public {
        vm.prank(user1);
        vm.expectRevert("Insufficient balance");
        farming.withdraw(100e18);
    }

    function testWithdrawWhenPaused() public {
        uint256 stakeAmount = 100e18;
        _approveLP(user1, stakeAmount);

        vm.prank(user1);
        farming.stake(stakeAmount);

        farming.pause();

        vm.prank(user1);
        vm.expectRevert();
        farming.withdraw(50e18);
    }

    function testEmergencyWithdraw() public {
        uint256 stakeAmount = 100e18;
        _approveLP(user1, stakeAmount);

        vm.prank(user1);
        farming.stake(stakeAmount);

        // Add some rewards
        farming.fundRewards(REWARD_AMOUNT, REWARD_DURATION);

        // Fast forward time to accumulate rewards
        vm.warp(block.timestamp + 1 days);

        // Check that user has earned rewards
        uint256 earnedBefore = farming.earned(user1);
        assertGt(earnedBefore, 0);

        vm.expectEmit(true, false, false, true);
        emit EmergencyWithdraw(user1, stakeAmount);

        vm.prank(user1);
        farming.emergencyWithdraw();

        // Check that LP tokens are returned
        assertEq(farming.balanceOf(user1), 0);
        assertEq(farming.totalSupply(), 0);

        // Check that rewards are cleared (not paid out)
        assertEq(farming.earned(user1), 0);
        assertEq(farming.rewards(user1), 0);
    }

    function testEmergencyWithdrawWhenPaused() public {
        uint256 stakeAmount = 100e18;
        _approveLP(user1, stakeAmount);

        vm.prank(user1);
        farming.stake(stakeAmount);

        farming.pause();

        // Emergency withdraw should work even when paused
        vm.prank(user1);
        farming.emergencyWithdraw();

        assertEq(farming.balanceOf(user1), 0);
    }

    function testEmergencyWithdrawNoTokens() public {
        vm.prank(user1);
        vm.expectRevert("No tokens to withdraw");
        farming.emergencyWithdraw();
    }

    function testFundRewards() public {
        vm.expectEmit(false, false, false, true);
        emit RewardAdded(REWARD_AMOUNT, REWARD_DURATION);

        farming.fundRewards(REWARD_AMOUNT, REWARD_DURATION);

    // Farming.rewardRate uses 1e18 precision internally: rewardRate = (rewardAmount * 1e18) / duration
    assertEq(farming.rewardRate(), (REWARD_AMOUNT * 1e18) / REWARD_DURATION);
        assertEq(farming.periodFinish(), block.timestamp + REWARD_DURATION);
        assertEq(farming.lastUpdateTime(), block.timestamp);
    }

    function testFundRewardsZeroDuration() public {
        vm.expectRevert("Duration must be > 0");
        farming.fundRewards(REWARD_AMOUNT, 0);
    }

    function testFundRewardsZeroAmount() public {
        vm.expectRevert("Reward must be > 0");
        farming.fundRewards(0, REWARD_DURATION);
    }

    function testFundRewardsWhenPaused() public {
        farming.pause();

        vm.expectRevert();
        farming.fundRewards(REWARD_AMOUNT, REWARD_DURATION);
    }

    function testClaim() public {
        uint256 stakeAmount = 100e18;
        _approveLP(user1, stakeAmount);

        vm.prank(user1);
        farming.stake(stakeAmount);

        // Fund rewards
        farming.fundRewards(REWARD_AMOUNT, REWARD_DURATION);

        // Fast forward time
        vm.warp(block.timestamp + 1 days);

        uint256 earnedBefore = farming.earned(user1);
        assertGt(earnedBefore, 0);

        uint256 balanceBefore = rewardToken.balanceOf(user1);

        vm.expectEmit(true, false, false, false);
        emit RewardPaid(user1, earnedBefore);

        vm.prank(user1);
        farming.claim();

        // Use approximate equality for reward calculations (1% tolerance)
        assertApproxEqRel(rewardToken.balanceOf(user1), balanceBefore + earnedBefore, 0.01e18);
        assertEq(farming.rewards(user1), 0);
    }

    function testClaimWhenPaused() public {
        uint256 stakeAmount = 100e18;
        _approveLP(user1, stakeAmount);

        vm.prank(user1);
        farming.stake(stakeAmount);

        farming.pause();

        vm.prank(user1);
        vm.expectRevert();
        farming.claim();
    }

    function testExit() public {
        uint256 stakeAmount = 100e18;
        _approveLP(user1, stakeAmount);

        vm.prank(user1);
        farming.stake(stakeAmount);

        // Fund rewards
        farming.fundRewards(REWARD_AMOUNT, REWARD_DURATION);

        // Fast forward time
        vm.warp(block.timestamp + 1 days);

        uint256 earnedBefore = farming.earned(user1);
        uint256 rewardBalanceBefore = rewardToken.balanceOf(user1);

        vm.prank(user1);
        farming.exit();

        // Check that all LP tokens are withdrawn
        assertEq(farming.balanceOf(user1), 0);

        // Check that rewards are claimed (with tolerance for precision - 1%)
        assertApproxEqRel(rewardToken.balanceOf(user1), rewardBalanceBefore + earnedBefore, 0.01e18);
    }

    function testPauseUnpause() public {
        assertFalse(farming.paused());

        farming.pause();
        assertTrue(farming.paused());

        farming.unpause();
        assertFalse(farming.paused());
    }

    function testPauseOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        farming.pause();
    }

    function testUnpauseOnlyOwner() public {
        farming.pause();

        vm.prank(user1);
        vm.expectRevert();
        farming.unpause();
    }

    function testRewardCalculation() public {
        uint256 stakeAmount = 100e18;
        _approveLP(user1, stakeAmount);

        vm.prank(user1);
        farming.stake(stakeAmount);

        // Fund rewards
        farming.fundRewards(REWARD_AMOUNT, REWARD_DURATION);

        // Fast forward half the duration
        vm.warp(block.timestamp + REWARD_DURATION / 2);

        uint256 earned = farming.earned(user1);
        uint256 expectedReward = REWARD_AMOUNT / 2; // Half the rewards over half the time

        // Allow for small rounding errors
        assertApproxEqRel(earned, expectedReward, 0.01e18); // 1% tolerance
    }

    function testMultipleStakers() public {
        uint256 stakeAmount = 100e18;

        // Both users stake equal amounts
        _approveLP(user1, stakeAmount);
        _approveLP(user2, stakeAmount);

        vm.prank(user1);
        farming.stake(stakeAmount);

        vm.prank(user2);
        farming.stake(stakeAmount);

        // Fund rewards
        farming.fundRewards(REWARD_AMOUNT, REWARD_DURATION);

        // Fast forward time
        vm.warp(block.timestamp + REWARD_DURATION / 2);

        uint256 earned1 = farming.earned(user1);
        uint256 earned2 = farming.earned(user2);

        // Both should earn approximately equal rewards
        assertApproxEqRel(earned1, earned2, 0.01e18); // 1% tolerance

        // Total rewards should be approximately half the total (for half the time)
        assertApproxEqRel(earned1 + earned2, REWARD_AMOUNT / 2, 0.01e18);
    }

    function testRecoverERC20() public {
        // Deploy a dummy token
        MockLPToken dummyToken = new MockLPToken();
        uint256 amount = 100e18;

        dummyToken.mint(address(farming), amount);

        uint256 balanceBefore = dummyToken.balanceOf(owner);

        farming.recoverERC20(address(dummyToken), amount);

        assertEq(dummyToken.balanceOf(owner), balanceBefore + amount);
        assertEq(dummyToken.balanceOf(address(farming)), 0);
    }

    function testRecoverERC20CannotRecoverLP() public {
        vm.expectRevert("Cannot recover LP token");
        farming.recoverERC20(address(lpToken), 100);
    }

    function testRecoverERC20CannotRecoverReward() public {
        vm.expectRevert("Cannot recover reward token");
        farming.recoverERC20(address(rewardToken), 100);
    }

    function testRecoverERC20CannotRecoverContract() public {
        vm.expectRevert("Cannot recover contract token");
        farming.recoverERC20(address(farming), 100);
    }

    function testRecoverERC20OnlyOwner() public {
        MockLPToken dummyToken = new MockLPToken();

        vm.prank(user1);
        vm.expectRevert();
        farming.recoverERC20(address(dummyToken), 100);
    }

    function testGetters() public {
        farming.fundRewards(REWARD_AMOUNT, REWARD_DURATION);

    // getRewardRate() returns the internal 1e18-scaled rewardRate
    assertEq(farming.getRewardRate(), (REWARD_AMOUNT * 1e18) / REWARD_DURATION);
        assertEq(farming.getPeriodFinish(), block.timestamp + REWARD_DURATION);
    }
}
