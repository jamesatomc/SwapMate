// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
/// @title Simple AMM Pool for KANARI <-> USDK
/// @notice Single-pool constant-product AMM with LP token, add/remove liquidity and swap
contract KanariUsdkPool {
	using SafeERC20 for IERC20;

	// --- Minimal ERC20 for LP token ---
	string public name = "Kanari-USDK LP";
	string public symbol = "KUSD-LP";
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

	function _mint(address to, uint256 amount) internal {
		_totalSupply += amount;
		_balances[to] += amount;
		emit Transfer(address(0), to, amount);
	}

	function _burn(address from, uint256 amount) internal {
		require(_balances[from] >= amount, "ERC20: burn amount exceeds balance");
		_balances[from] -= amount;
		_totalSupply -= amount;
		emit Transfer(from, address(0), amount);
	}

	// --- simple ownable ---
	address public owner;
	modifier onlyOwner() {
		require(msg.sender == owner, "Not owner");
		_;
	}

	IERC20 public immutable tokenA; // USDK
	IERC20 public immutable tokenB; // KANARI

	// fee in basis points (out of 10000). e.g. 30 = 0.3%
	uint256 public feeBps = 30;
	uint256 public constant BPS = 10000;

	event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpMinted);
	event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpBurned);
	event Swap(address indexed trader, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);
	event FeeUpdated(uint256 newFeeBps);

	constructor(address _tokenA, address _tokenB) {
		require(_tokenA != address(0) && _tokenB != address(0), "Invalid token addresses");
		tokenA = IERC20(_tokenA);
		tokenB = IERC20(_tokenB);
		owner = msg.sender;
	}

	/// @notice View reserves in the pool
	function getReserves() public view returns (uint256 reserveA, uint256 reserveB) {
		reserveA = tokenA.balanceOf(address(this));
		reserveB = tokenB.balanceOf(address(this));
	}

	/// @notice Add liquidity by providing both tokens. Caller must approve tokens first.
	/// On first deposit, LP minted = sqrt(amountA * amountB)
	function addLiquidity(uint256 amountA, uint256 amountB) external returns (uint256 lpMinted) {
		require(amountA > 0 && amountB > 0, "Amounts must be > 0");

		(uint256 reserveA, uint256 reserveB) = getReserves();

		// transfer tokens in
		tokenA.safeTransferFrom(msg.sender, address(this), amountA);
		tokenB.safeTransferFrom(msg.sender, address(this), amountB);

		if (totalSupply() == 0) {
			// initial liquidity
			lpMinted = _sqrt(amountA * amountB);
			require(lpMinted > 0, "Insufficient liquidity minted");
			_mint(msg.sender, lpMinted);
		} else {
			// must provide proportional amounts
			uint256 lpFromA = (amountA * totalSupply()) / reserveA;
			uint256 lpFromB = (amountB * totalSupply()) / reserveB;
			// mint based on the limiting ratio
			lpMinted = lpFromA < lpFromB ? lpFromA : lpFromB;
			require(lpMinted > 0, "Insufficient liquidity minted");
			_mint(msg.sender, lpMinted);
		}

		emit LiquidityAdded(msg.sender, amountA, amountB, lpMinted);
	}

	/// @notice Remove liquidity by burning LP tokens. Returns underlying tokens proportionally.
	function removeLiquidity(uint256 lpAmount) external returns (uint256 amountA, uint256 amountB) {
		require(lpAmount > 0, "LP amount must be > 0");
		uint256 supply = totalSupply();
		require(supply > 0, "No liquidity");

		(uint256 reserveA, uint256 reserveB) = getReserves();

		amountA = (reserveA * lpAmount) / supply;
		amountB = (reserveB * lpAmount) / supply;

		_burn(msg.sender, lpAmount);

		// transfer underlying
		tokenA.safeTransfer(msg.sender, amountA);
		tokenB.safeTransfer(msg.sender, amountB);

		emit LiquidityRemoved(msg.sender, amountA, amountB, lpAmount);
	}

	/// @notice Swap tokenIn -> tokenOut using constant product formula with fee
	/// Caller must approve tokenIn to this contract.
	function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut) {
		require(amountIn > 0, "amountIn must be > 0");
		require(tokenIn == address(tokenA) || tokenIn == address(tokenB), "Invalid tokenIn");

		bool isA = tokenIn == address(tokenA);
		IERC20 inToken = isA ? tokenA : tokenB;
		IERC20 outToken = isA ? tokenB : tokenA;

		(uint256 reserveA, uint256 reserveB) = getReserves();
		uint256 reserveIn = isA ? reserveA : reserveB;
		uint256 reserveOut = isA ? reserveB : reserveA;

		// transfer in
		inToken.safeTransferFrom(msg.sender, address(this), amountIn);

		uint256 amountInWithFee = amountIn * (BPS - feeBps);
		uint256 numerator = amountInWithFee * reserveOut;
		uint256 denominator = (reserveIn * BPS) + amountInWithFee;
		amountOut = numerator / denominator;

		require(amountOut >= minAmountOut, "INSUFFICIENT_OUTPUT_AMOUNT");

		// transfer out
		outToken.safeTransfer(msg.sender, amountOut);

		emit Swap(msg.sender, tokenIn, amountIn, address(outToken), amountOut);
	}

	/// @notice Owner can update fee (in bps)
	function setFeeBps(uint256 newFee) external onlyOwner {
		require(newFee <= 500, "Fee too high"); // max 5%
		feeBps = newFee;
		emit FeeUpdated(newFee);
	}

	// --- Math helpers ---
	function _sqrt(uint256 y) internal pure returns (uint256 z) {
		if (y == 0) return 0;
		uint256 x = y / 2 + 1;
		z = y;
		while (x < z) {
			z = x;
			x = (y / x + x) / 2;
		}
	}
}


