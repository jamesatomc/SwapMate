// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
/// @title Simple AMM Pool (generic token pair)
/// @notice Single-pool constant-product AMM for any two tokens (supports native via address(0)), with LP token, add/remove liquidity and swap
contract ConstantProductAMM {
	using SafeERC20 for IERC20;

	// --- Minimal ERC20 for LP token ---
	string public name = "AMM LP Token";
	string public symbol = "AMM-LP";
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

	// token address; use address(0) to indicate native chain coin (ETH/BNB/...)
	address public immutable tokenA; // USDK or native (address(0))
	address public immutable tokenB; // KANARI or native (address(0))

	// fee in basis points (out of 10000). e.g. 30 = 0.3%
	uint256 public feeBps = 30;
	uint256 public constant BPS = 10000;

	event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpMinted);
	event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpBurned);
	event Swap(address indexed trader, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);
	event FeeUpdated(uint256 newFeeBps);

	constructor(address _tokenA, address _tokenB) {
		// allow one of the tokens to be the native coin (address(0)), but not both
		require(!(_tokenA == address(0) && _tokenB == address(0)), "Both tokens cannot be native");
		tokenA = _tokenA;
		tokenB = _tokenB;
		owner = msg.sender;
	}

	/// @notice View reserves in the pool
	// helper to check native token
	function _isNative(address token) internal pure returns (bool) {
		return token == address(0);
	}

	// safe balance reader that supports native coin
	function getReserves() public view returns (uint256 reserveA, uint256 reserveB) {
		reserveA = _isNative(tokenA) ? address(this).balance : IERC20(tokenA).balanceOf(address(this));
		reserveB = _isNative(tokenB) ? address(this).balance : IERC20(tokenB).balanceOf(address(this));
	}

	/// @notice Add liquidity by providing both tokens. Caller must approve tokens first.
	/// On first deposit, LP minted = sqrt(amountA * amountB)
	function addLiquidity(uint256 amountA, uint256 amountB) external payable returns (uint256 lpMinted) {
		require(amountA > 0 && amountB > 0, "Amounts must be > 0");

		(uint256 reserveA, uint256 reserveB) = getReserves();

		// transfer tokens in; if a token is native, the user must send msg.value equal to that amount
		require(!(_isNative(tokenA) && _isNative(tokenB)), "Both tokens cannot be native");

		if (_isNative(tokenA)) {
			require(msg.value == amountA, "Incorrect native value for tokenA");
			// getReserves already included msg.value, subtract it to simulate pre-transfer reserve
			require(reserveA >= amountA, "Reserve underflow");
			reserveA -= amountA;
		} else {
			// when tokenA is ERC20, ensure caller did not send native value
			require(msg.value == 0 || !_isNative(tokenB), "Unexpected native value");
			IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
		}

		if (_isNative(tokenB)) {
			if (!_isNative(tokenA)) {
				require(msg.value == amountB, "Incorrect native value for tokenB");
			}
			require(reserveB >= amountB, "Reserve underflow");
			reserveB -= amountB;
		} else {
			// when tokenB is ERC20, ensure caller did not send native value
			require(msg.value == 0 || !_isNative(tokenA), "Unexpected native value");
			IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);
		}

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

		// transfer underlying, handle native coin
		if (_isNative(tokenA)) {
			(bool sent, ) = payable(msg.sender).call{value: amountA}("");
			require(sent, "Native transfer failed");
		} else {
			IERC20(tokenA).safeTransfer(msg.sender, amountA);
		}

		if (_isNative(tokenB)) {
			(bool sent, ) = payable(msg.sender).call{value: amountB}("");
			require(sent, "Native transfer failed");
		} else {
			IERC20(tokenB).safeTransfer(msg.sender, amountB);
		}

		emit LiquidityRemoved(msg.sender, amountA, amountB, lpAmount);
	}

	/// @notice Swap tokenIn -> tokenOut using constant product formula with fee
	/// Caller must approve tokenIn to this contract. If tokenIn is native, send native value with the call.
	function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut) external payable returns (uint256 amountOut) {
		require(amountIn > 0, "amountIn must be > 0");
		require(tokenIn == tokenA || tokenIn == tokenB, "Invalid tokenIn");

		bool isA = tokenIn == tokenA;
		address inTokenAddr = isA ? tokenA : tokenB;
		address outTokenAddr = isA ? tokenB : tokenA;

		(uint256 reserveA, uint256 reserveB) = getReserves();
		uint256 reserveIn = isA ? reserveA : reserveB;
		uint256 reserveOut = isA ? reserveB : reserveA;

		// transfer in (handle native vs ERC20). For native, msg.value must equal amountIn.
		if (_isNative(inTokenAddr)) {
			require(msg.value == amountIn, "Incorrect msg.value for native input");
			// getReserves included msg.value, but reserveIn variable is the current balance; to compute output we need pre-transfer reserve
			reserveIn = reserveIn >= amountIn ? reserveIn - amountIn : 0;
		} else {
			require(msg.value == 0, "Unexpected native value");
			IERC20(inTokenAddr).safeTransferFrom(msg.sender, address(this), amountIn);
		}

		uint256 amountInWithFee = amountIn * (BPS - feeBps);
		uint256 numerator = amountInWithFee * reserveOut;
		uint256 denominator = (reserveIn * BPS) + amountInWithFee;
		amountOut = numerator / denominator;

		require(amountOut >= minAmountOut, "INSUFFICIENT_OUTPUT_AMOUNT");

		// transfer out
		if (_isNative(outTokenAddr)) {
			(bool sent, ) = payable(msg.sender).call{value: amountOut}("");
			require(sent, "Native transfer failed");
		} else {
			IERC20(outTokenAddr).safeTransfer(msg.sender, amountOut);
		}

		emit Swap(msg.sender, tokenIn, amountIn, outTokenAddr, amountOut);
	}

	// allow contract to receive native tokens
	receive() external payable {}
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


