// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Enhanced PoolManager with liquidity pools and swap functionality
contract PoolManager {
    using SafeERC20 for IERC20;
    
    struct Pool {
        address tokenA;
        address tokenB;
        uint256 freeValue;
        uint256 reserveA;     // Reserve of tokenA
        uint256 reserveB;     // Reserve of tokenB
        uint256 totalLiquidity; // Total LP tokens
        bool exists;
    }

    address public owner;
    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => mapping(address => uint256)) public liquidityOf; // poolId => user => LP tokens
    bytes32[] public poolIds;

    // Events
    event PoolAdded(bytes32 indexed id, address tokenA, address tokenB);
    event FreeValueSet(bytes32 indexed id, uint256 freeValue);
    event LiquidityAdded(bytes32 indexed poolId, address indexed user, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(bytes32 indexed poolId, address indexed user, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(bytes32 indexed poolId, address indexed user, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Deterministic id for a token pair (tokenA, tokenB)
    function poolIdFor(address a, address b) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(a, b));
    }

    /// @notice Add a new pool for token pair (a,b). Reverts if pair invalid or already exists.
    function addPool(address a, address b) external returns (bytes32) {
        require(a != address(0) && b != address(0) && a != b, "invalid tokens");
        bytes32 id = poolIdFor(a, b);
        require(!pools[id].exists, "pool exists");
        pools[id] = Pool({
            tokenA: a, 
            tokenB: b, 
            freeValue: 0, 
            reserveA: 0, 
            reserveB: 0, 
            totalLiquidity: 0, 
            exists: true
        });
        poolIds.push(id);
        emit PoolAdded(id, a, b);
        return id;
    }

    /// @notice Only owner can set the free value for a pool.
    function setFreeValue(bytes32 id, uint256 value) external onlyOwner {
        require(pools[id].exists, "no pool");
        pools[id].freeValue = value;
        emit FreeValueSet(id, value);
    }

    /// @notice Returns pool data.
    function getPool(bytes32 id) external view returns (address tokenA, address tokenB, uint256 freeValue, bool exists) {
        Pool memory p = pools[id];
        return (p.tokenA, p.tokenB, p.freeValue, p.exists);
    }

    /// @notice Get pool reserves
    function getReserves(bytes32 id) external view returns (uint256 reserveA, uint256 reserveB) {
        Pool memory p = pools[id];
        return (p.reserveA, p.reserveB);
    }

    /// @notice Convenience getter: free value for a token pair.
    function freeValueOf(address a, address b) external view returns (uint256) {
        return pools[poolIdFor(a, b)].freeValue;
    }

    /// @notice Add liquidity to a pool
    function addLiquidity(bytes32 poolId, uint256 amountA, uint256 amountB) external {
        require(pools[poolId].exists, "pool does not exist");
        Pool storage pool = pools[poolId];
        
        IERC20 tokenA = IERC20(pool.tokenA);
        IERC20 tokenB = IERC20(pool.tokenB);
        
        // Transfer tokens from user
        tokenA.safeTransferFrom(msg.sender, address(this), amountA);
        tokenB.safeTransferFrom(msg.sender, address(this), amountB);
        
        uint256 liquidity;
        if (pool.totalLiquidity == 0) {
            // First liquidity provider
            liquidity = sqrt(amountA * amountB);
        } else {
            // Calculate liquidity based on existing ratio
            uint256 liquidityA = (amountA * pool.totalLiquidity) / pool.reserveA;
            uint256 liquidityB = (amountB * pool.totalLiquidity) / pool.reserveB;
            liquidity = liquidityA < liquidityB ? liquidityA : liquidityB;
        }
        
        require(liquidity > 0, "insufficient liquidity");
        
        // Update pool state
        pool.reserveA += amountA;
        pool.reserveB += amountB;
        pool.totalLiquidity += liquidity;
        liquidityOf[poolId][msg.sender] += liquidity;
        
        emit LiquidityAdded(poolId, msg.sender, amountA, amountB, liquidity);
    }

    /// @notice Remove liquidity from a pool
    function removeLiquidity(bytes32 poolId, uint256 liquidity) external {
        require(pools[poolId].exists, "pool does not exist");
        require(liquidityOf[poolId][msg.sender] >= liquidity, "insufficient liquidity");
        
        Pool storage pool = pools[poolId];
        
        // Calculate amounts to return
        uint256 amountA = (liquidity * pool.reserveA) / pool.totalLiquidity;
        uint256 amountB = (liquidity * pool.reserveB) / pool.totalLiquidity;
        
        // Update state
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        pool.totalLiquidity -= liquidity;
        liquidityOf[poolId][msg.sender] -= liquidity;
        
        // Transfer tokens back to user
        IERC20(pool.tokenA).safeTransfer(msg.sender, amountA);
        IERC20(pool.tokenB).safeTransfer(msg.sender, amountB);
        
        emit LiquidityRemoved(poolId, msg.sender, amountA, amountB, liquidity);
    }

    /// @notice Swap tokenA for tokenB or vice versa
    function swap(bytes32 poolId, address tokenIn, uint256 amountIn, uint256 minAmountOut) external {
        require(pools[poolId].exists, "pool does not exist");
        Pool storage pool = pools[poolId];
        require(tokenIn == pool.tokenA || tokenIn == pool.tokenB, "invalid token");
        
        bool isTokenA = tokenIn == pool.tokenA;
        address tokenOut = isTokenA ? pool.tokenB : pool.tokenA;
        
        uint256 reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isTokenA ? pool.reserveB : pool.reserveA;
        
        // Calculate output amount using constant product formula (x * y = k)
        // amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
        // Apply 0.3% fee
        uint256 amountInWithFee = amountIn * 997; // 99.7% after 0.3% fee
        uint256 amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
        
        require(amountOut >= minAmountOut, "insufficient output amount");
        require(amountOut < reserveOut, "insufficient liquidity");
        
        // Transfer input token from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Update reserves
        if (isTokenA) {
            pool.reserveA += amountIn;
            pool.reserveB -= amountOut;
        } else {
            pool.reserveB += amountIn;
            pool.reserveA -= amountOut;
        }
        
        // Transfer output token to user
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        emit Swap(poolId, msg.sender, tokenIn, amountIn, tokenOut, amountOut);
    }

    /// @notice Get swap quote
    function getSwapQuote(bytes32 poolId, address tokenIn, uint256 amountIn) external view returns (uint256 amountOut) {
        require(pools[poolId].exists, "pool does not exist");
        Pool memory pool = pools[poolId];
        require(tokenIn == pool.tokenA || tokenIn == pool.tokenB, "invalid token");
        
        bool isTokenA = tokenIn == pool.tokenA;
        uint256 reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isTokenA ? pool.reserveB : pool.reserveA;
        
        if (reserveIn == 0 || reserveOut == 0) return 0;
        
        // Calculate output amount with 0.3% fee
        uint256 amountInWithFee = amountIn * 997;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
    }

    /// @notice Square root function for liquidity calculation
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}
