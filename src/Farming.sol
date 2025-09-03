// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts/contracts/utils/Pausable.sol";
import "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/// @title Farming / Staking contract for AMM LP tokens
/// @notice Stake LP tokens (the AMM contract itself) and earn rewards in a reward token (e.g. `Kanari`).
contract Farming is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable lpToken; // LP token (the AMM contract address)
    IERC20 public immutable rewardToken; // reward token (e.g. Kanari)

    uint256 public rewardRate; // reward tokens distributed per second
    uint256 public periodFinish; // timestamp when current reward period ends
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    uint256 private _totalSupply; // total staked LP
    mapping(address => uint256) private _balances;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardAdded(uint256 reward, uint256 duration);
    event TokenRecovered(address indexed token, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    constructor(address _lpToken, address _rewardToken) Ownable(msg.sender) {
        require(_lpToken != address(0), "Invalid LP token");
        require(_rewardToken != address(0), "Invalid reward token");
        lpToken = IERC20(_lpToken);
        rewardToken = IERC20(_rewardToken);
    }

    /* ========== VIEWS ========== */

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        uint256 timeDelta = lastTimeRewardApplicable() - lastUpdateTime;
        return rewardPerTokenStored + (timeDelta * rewardRate * 1e18) / _totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        return (_balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 + rewards[account];
    }

    /* ========== MUTATIVE ========== */

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /// @notice Stake LP tokens. Caller must approve LP token to this contract first.
    function stake(uint256 amount) external whenNotPaused nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        _totalSupply += amount;
        _balances[msg.sender] += amount;
        lpToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    /// @notice Withdraw staked LP tokens
    function withdraw(uint256 amount) public whenNotPaused nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        _totalSupply -= amount;
        _balances[msg.sender] -= amount;
        lpToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Claim accumulated rewards
    function claim() public whenNotPaused nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /// @notice Withdraw everything and claim rewards
    function exit() external {
        withdraw(_balances[msg.sender]);
        claim();
    }

    /// @notice Emergency withdraw LP tokens without claiming rewards (works even when paused)
    function emergencyWithdraw() external nonReentrant {
        uint256 amount = _balances[msg.sender];
        require(amount > 0, "No tokens to withdraw");

        _totalSupply -= amount;
        _balances[msg.sender] = 0;

        // Clear user's reward state without paying out
        rewards[msg.sender] = 0;
        userRewardPerTokenPaid[msg.sender] = 0;

        lpToken.safeTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /// @notice Fund the contract with reward tokens and start/replenish a reward period
    /// @param rewardAmount amount of reward tokens to add
    /// @param duration duration (in seconds) over which rewards are distributed
    function fundRewards(uint256 rewardAmount, uint256 duration)
        external
        onlyOwner
        whenNotPaused
        nonReentrant
        updateReward(address(0))
    {
        require(duration > 0, "Duration must be > 0");
        require(rewardAmount > 0, "Reward must be > 0");

        // pull reward tokens from caller
        rewardToken.safeTransferFrom(msg.sender, address(this), rewardAmount);

        if (block.timestamp >= periodFinish) {
            rewardRate = rewardAmount / duration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (rewardAmount + leftover) / duration;
        }

        // safety: ensure rewardRate is non-zero when rewardAmount >= duration
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + duration;

        emit RewardAdded(rewardAmount, duration);
    }

    /// @notice Recover ERC20 tokens accidentally sent to this contract (except staked LP and rewards)
    function recoverERC20(address token, uint256 amount) external onlyOwner {
        require(token != address(lpToken), "Cannot recover LP token");
        require(token != address(rewardToken), "Cannot recover reward token");
        require(token != address(this), "Cannot recover contract token");
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokenRecovered(token, amount);
    }

    /// @notice Explicit getter for reward rate (convenience for frontends)
    function getRewardRate() external view returns (uint256) {
        return rewardRate;
    }

    /// @notice Explicit getter for period finish (convenience for frontends)
    function getPeriodFinish() external view returns (uint256) {
        return periodFinish;
    }

    /// @notice Pause the contract (emergency use only)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract
    function unpause() external onlyOwner {
        _unpause();
    }

    /* ========== HELPERS ========== */

    // Fallback to receive ETH (not expected, but present)
    receive() external payable {}
}
