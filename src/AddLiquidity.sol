// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
/// @title Simple AMM Pool (generic token pair)
/// @notice Single-pool constant-product AMM for any two tokens (supports native via address(0)), with LP token, add/remove liquidity and swap
contract ConstantProductAMM is ReentrancyGuard {
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
	address public feeRecipient; // Address to receive collected fees
	modifier onlyOwner() {
		require(msg.sender == owner, "Not owner");
		_;
	}

	// token address; use address(0) to indicate native chain coin (ETH/BNB/...)
	address public immutable tokenA; // USDK or native (address(0))
	address public immutable tokenB; // KANARI or native (address(0))

	// fee in basis points (out of 10000). e.g. 30 = 0.3%
	uint256 public feeBps = 30; // Protocol trading fee (for liquidity)
	uint256 public devFeeBps = 10; // Dev fee (sent to feeRecipient) - 0.1%
	uint256 public constant BPS = 10000;

	event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpMinted);
	event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpBurned);
	event Swap(address indexed trader, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut, uint256 fee);
	event FeeUpdated(uint256 newFeeBps);
	event DevFeeUpdated(uint256 newDevFeeBps);
	event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
	event FeesCollected(address indexed recipient, uint256 amount, address token);

	constructor(address _tokenA, address _tokenB) {
		// allow one of the tokens to be the native coin (address(0)), but not both
		require(!(_tokenA == address(0) && _tokenB == address(0)), "Both tokens cannot be native");
		tokenA = _tokenA;
		tokenB = _tokenB;
		owner = msg.sender;
		feeRecipient = msg.sender; // Default fee recipient is owner
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
	function addLiquidity(
		uint256 amountA,
		uint256 amountB,
		uint256 minAmountA,
		uint256 minAmountB,
		uint256 deadline
	) external payable nonReentrant returns (uint256 lpMinted) {
		require(block.timestamp <= deadline, "Deadline exceeded");
		require(amountA > 0 && amountB > 0, "Amounts must be > 0");

		// only one token may be native (constructor enforces this)
		require(!(_isNative(tokenA) && _isNative(tokenB)), "Both tokens cannot be native");

		// compute reserves as they were before this call (msg.value is already included in address(this).balance)
		uint256 reserveABefore = _isNative(tokenA) ? (address(this).balance - msg.value) : IERC20(tokenA).balanceOf(address(this));
		uint256 reserveBBefore = _isNative(tokenB) ? (address(this).balance - msg.value) : IERC20(tokenB).balanceOf(address(this));

		// expected native value: sum of native amounts for tokenA and tokenB (only one can be native)
		uint256 expectedNative = 0;
		if (_isNative(tokenA)) expectedNative += amountA;
		if (_isNative(tokenB)) expectedNative += amountB;
		require(msg.value == expectedNative, "Incorrect native value");

		// pull ERC20 tokens (native amount already sent as msg.value)
		if (!_isNative(tokenA)) {
			IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
		}
		if (!_isNative(tokenB)) {
			IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);
		}

	if (totalSupply() == 0) {
			// initial liquidity: compute product with explicit overflow check
			uint256 product;
			unchecked { product = amountA * amountB; }
			require(amountA == 0 || product / amountA == amountB, "Multiplication overflow");
			lpMinted = _sqrt(product);
			require(lpMinted > 0, "Insufficient liquidity minted");
			_mint(msg.sender, lpMinted);
		} else {
			// must provide proportional amounts based on reserves before this call
			require(reserveABefore > 0 && reserveBBefore > 0, "Insufficient reserve");
			
			// Safe calculation to prevent overflow: lpFromA = (amountA * totalSupply()) / reserveABefore
			uint256 totalSup = totalSupply();
			require(amountA <= type(uint256).max / totalSup, "AmountA too large");
			uint256 lpFromA = (amountA * totalSup) / reserveABefore;
			
			// Safe calculation to prevent overflow: lpFromB = (amountB * totalSupply()) / reserveBBefore  
			require(amountB <= type(uint256).max / totalSup, "AmountB too large");
			uint256 lpFromB = (amountB * totalSup) / reserveBBefore;
			
			lpMinted = lpFromA < lpFromB ? lpFromA : lpFromB;
			require(lpMinted > 0, "Insufficient liquidity minted");
			// slippage protection: ensure provided amounts meet user's minimums
			require(amountA >= minAmountA, "Insufficient amountA provided");
			require(amountB >= minAmountB, "Insufficient amountB provided");
			_mint(msg.sender, lpMinted);
		}

		emit LiquidityAdded(msg.sender, amountA, amountB, lpMinted);
	}

	/// @notice Remove liquidity by burning LP tokens. Returns underlying tokens proportionally.
	function removeLiquidity(
		uint256 lpAmount,
		uint256 minAmountA,
		uint256 minAmountB,
		uint256 deadline
	) external nonReentrant returns (uint256 amountA, uint256 amountB) {
		require(block.timestamp <= deadline, "Deadline exceeded");
		require(lpAmount > 0, "LP amount must be > 0");
		uint256 supply = totalSupply();
		require(supply > 0, "No liquidity");

		(uint256 reserveA, uint256 reserveB) = getReserves();

		amountA = (reserveA * lpAmount) / supply;
		amountB = (reserveB * lpAmount) / supply;

	require(amountA >= minAmountA, "AmountA too low");
	require(amountB >= minAmountB, "AmountB too low");

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
	function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut, uint256 deadline) external payable nonReentrant returns (uint256 amountOut) {
		require(block.timestamp <= deadline, "Deadline exceeded");
		require(amountIn > 0, "amountIn must be > 0");
		require(tokenIn == tokenA || tokenIn == tokenB, "Invalid tokenIn");

		bool isA = tokenIn == tokenA;
		(uint256 reserveA, uint256 reserveB) = getReserves();

		// Calculate fee amount for dev wallet
		uint256 feeAmount = (amountIn * devFeeBps) / BPS;
		uint256 amountInAfterDevFee = amountIn - feeAmount;

		// handle input transfer / native handling and adjust reserves
		if (_isNative(tokenIn)) {
			require(msg.value == amountIn, "Incorrect msg.value for native input");
			
			// Send dev fee
			if (feeAmount > 0 && feeRecipient != address(0)) {
				(bool sent, ) = payable(feeRecipient).call{value: feeAmount}("");
				require(sent, "Dev fee transfer failed");
				emit FeesCollected(feeRecipient, feeAmount, tokenIn);
			}
			
			uint256 reserveInBefore = isA ? reserveA - amountInAfterDevFee : reserveB - amountInAfterDevFee;
			amountOut = _calculateSwapOutput(amountInAfterDevFee, reserveInBefore, isA ? reserveB : reserveA);
		} else {
			require(msg.value == 0, "Unexpected native value");
			IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
			
			// Send dev fee
			if (feeAmount > 0 && feeRecipient != address(0)) {
				IERC20(tokenIn).safeTransfer(feeRecipient, feeAmount);
				emit FeesCollected(feeRecipient, feeAmount, tokenIn);
			}
			
			amountOut = _calculateSwapOutput(amountInAfterDevFee, isA ? reserveA : reserveB, isA ? reserveB : reserveA);
		}

		require(amountOut >= minAmountOut, "INSUFFICIENT_OUTPUT_AMOUNT");

		// Transfer output token
		address outToken = isA ? tokenB : tokenA;
		if (_isNative(outToken)) {
			(bool sent, ) = payable(msg.sender).call{value: amountOut}("");
			require(sent, "Native transfer failed");
		} else {
			IERC20(outToken).safeTransfer(msg.sender, amountOut);
		}

		emit Swap(msg.sender, tokenIn, amountIn, outToken, amountOut, feeAmount);
	}

	function _calculateSwapOutput(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal view returns (uint256) {
		// Note: amountIn here should already have dev fee deducted
		// Apply trading fee (different from dev fee)
		uint256 amountInWithFee = amountIn * (BPS - feeBps);
		
		// Check for overflow in numerator calculation
		require(amountInWithFee <= type(uint256).max / reserveOut, "AmountIn too large");
		uint256 numerator = amountInWithFee * reserveOut;
		
		uint256 denominator = (reserveIn * BPS) + amountInWithFee;
		return numerator / denominator;
	}

	/// @notice View helper to estimate output amount for a given input and token
	function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256 amountOut) {
		require(tokenIn == tokenA || tokenIn == tokenB, "Invalid tokenIn");
		require(amountIn > 0, "AmountIn must be > 0");

		bool isA = tokenIn == tokenA;
		(uint256 reserveA, uint256 reserveB) = getReserves();
		uint256 reserveIn = isA ? reserveA : reserveB;
		uint256 reserveOut = isA ? reserveB : reserveA;

		// First deduct dev fee, then apply trading fee
		uint256 devFee = (amountIn * devFeeBps) / BPS;
		uint256 amountInAfterDevFee = amountIn - devFee;
		uint256 amountInWithFee = amountInAfterDevFee * (BPS - feeBps);
		
		// Check for overflow in numerator calculation
		require(amountInWithFee <= type(uint256).max / reserveOut, "AmountIn too large for calculation");
		uint256 numerator = amountInWithFee * reserveOut;
		
		uint256 denominator = (reserveIn * BPS) + amountInWithFee;
		amountOut = numerator / denominator;
	}

	/// @notice View helper to estimate price impact in basis points for a given trade
	function getPriceImpact(uint256 amountIn, address tokenIn) external view returns (uint256 impactBps) {
		require(amountIn > 0, "AmountIn must be > 0");
		uint256 amountOut = this.getAmountOut(amountIn, tokenIn);
		
		// Calculate expected output without any fees (perfect 1:1 ratio)
		uint256 devFee = (amountIn * devFeeBps) / BPS;
		uint256 amountInAfterDevFee = amountIn - devFee;
		require(amountInAfterDevFee <= type(uint256).max / (BPS - feeBps), "AmountIn too large for impact calculation");
		uint256 expectedOut = (amountInAfterDevFee * (BPS - feeBps)) / BPS;
		
		if (expectedOut == 0) return 0;
		if (expectedOut <= amountOut) return 0; // No negative impact
		
		// Check for overflow in impact calculation
		uint256 diff = expectedOut - amountOut;
		require(diff <= type(uint256).max / BPS, "Impact calculation overflow");
		impactBps = (diff * BPS) / expectedOut;
	}

	// allow contract to receive native tokens
	receive() external payable {}
	
	function setFeeBps(uint256 newFee) external onlyOwner {
		require(newFee <= 500, "Fee too high"); // max 5%
		require(newFee < BPS, "Fee must be less than 10000");
		feeBps = newFee;
		emit FeeUpdated(newFee);
	}

	/// @notice Set the dev fee rate in basis points
	function setDevFeeBps(uint256 newDevFee) external onlyOwner {
		require(newDevFee <= 100, "Dev fee too high"); // max 1%
		require(newDevFee < BPS, "Dev fee must be less than 10000");
		devFeeBps = newDevFee;
		emit DevFeeUpdated(newDevFee);
	}

	/// @notice Set the fee recipient address (dev wallet)
	function setFeeRecipient(address newFeeRecipient) external onlyOwner {
		require(newFeeRecipient != address(0), "Invalid fee recipient");
		address oldRecipient = feeRecipient;
		feeRecipient = newFeeRecipient;
		emit FeeRecipientUpdated(oldRecipient, newFeeRecipient);
	}

	/// @notice Withdraw accumulated fees (emergency function)
	function withdrawFees(address token, uint256 amount) external onlyOwner {
		require(feeRecipient != address(0), "No fee recipient set");
		
		if (token == address(0)) {
			// Withdraw native token
			require(amount <= address(this).balance, "Insufficient balance");
			(bool sent, ) = payable(feeRecipient).call{value: amount}("");
			require(sent, "Fee withdrawal failed");
		} else {
			// Withdraw ERC20 token
			IERC20(token).safeTransfer(feeRecipient, amount);
		}
		
		emit FeesCollected(feeRecipient, amount, token);
	}

	// --- Math helpers ---
	function _sqrt(uint256 x) internal pure returns (uint256 z) {
		if (x == 0) return 0;
		// Initial estimate via bit length
		uint256 r = 1;
		uint256 xx = x;
		if (xx >= 0x100000000000000000000000000000000) { xx >>= 128; r <<= 64; }
		if (xx >= 0x10000000000000000) { xx >>= 64; r <<= 32; }
		if (xx >= 0x100000000) { xx >>= 32; r <<= 16; }
		if (xx >= 0x10000) { xx >>= 16; r <<= 8; }
		if (xx >= 0x100) { xx >>= 8; r <<= 4; }
		if (xx >= 0x10) { xx >>= 4; r <<= 2; }
		if (xx >= 0x8) { r <<= 1; }
		// Newton iterations (3-4 iterations is enough for 256-bit numbers)
		z = r;
		z = (z + x / z) >> 1;
		z = (z + x / z) >> 1;
		z = (z + x / z) >> 1;
		uint256 z2 = x / z;
		if (z2 < z) z = z2;
	}
}


