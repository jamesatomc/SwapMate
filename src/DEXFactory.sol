// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./ConstantProductAMM.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";

/// @title DEX Factory - Creates and manages DEX pools
/// @notice Factory contract for deploying new trading pairs
contract DEXFactory is Ownable {
    mapping(address => mapping(address => address)) public getPool;
    address[] public allPools;
    mapping(address => bool) public isPool; // track pools created by this factory

    address public feeRecipient;
    uint256 public defaultDevFeeBps = 10; // 0.1%
    uint256 public defaultFeeBps = 30; // 0.3%

    event PoolCreated(address indexed token0, address indexed token1, address pool, uint256 poolCount);

    event FeeRecipientUpdated(address indexed newRecipient);
    event DefaultFeesUpdated(uint256 devFeeBps, uint256 feeBps);
    event PoolFeeRecipientUpdated(address indexed pool, address indexed newRecipient);
    event PoolFeesUpdated(address indexed pool, uint256 devFeeBps, uint256 feeBps);

    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    /// @notice Create a new trading pool for two tokens
    /// @param tokenA First token address (use address(0) for native coin)
    /// @param tokenB Second token address (use address(0) for native coin)
    /// @return pool Address of the created pool
    function createPool(address tokenA, address tokenB) external returns (address pool) {
        require(tokenA != tokenB, "Identical tokens");
        require(tokenA != address(0) || tokenB != address(0), "Both tokens cannot be zero");

        // Order tokens to ensure consistent pair mapping
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(getPool[token0][token1] == address(0), "Pool already exists");

        // Deploy new pool - use {value: 0} if native token is involved
        ConstantProductAMM newPool;
        if (token0 == address(0) || token1 == address(0)) {
            newPool = (new ConstantProductAMM){value: 0}(token0, token1);
        } else {
            newPool = new ConstantProductAMM(token0, token1);
        }
        pool = address(newPool);

        // Set up fees and recipient
        newPool.setFeeRecipient(feeRecipient);
        newPool.setDevFeeBps(defaultDevFeeBps);
        newPool.setFeeBps(defaultFeeBps);

        // Store pool mapping
        getPool[token0][token1] = pool;
        getPool[token1][token0] = pool; // Both directions
        allPools.push(pool);
        isPool[pool] = true;

        emit PoolCreated(token0, token1, pool, allPools.length);
    }

    /// @notice Update fee recipient for all future pools
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    /// @notice Update default fees for new pools
    function setDefaultFees(uint256 _devFeeBps, uint256 _feeBps) external onlyOwner {
        require(_devFeeBps <= 100, "Dev fee too high"); // Max 1%
        require(_feeBps <= 500, "Fee too high"); // Max 5%

        defaultDevFeeBps = _devFeeBps;
        defaultFeeBps = _feeBps;

        emit DefaultFeesUpdated(_devFeeBps, _feeBps);
    }

    /// @notice Renounce ownership to lock contract permanently
    function renounceOwnership() public override onlyOwner {
        super.renounceOwnership();
    }

    /// @notice Get total number of pools
    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }

    /// @notice Get all pool addresses
    function getAllPools() external view returns (address[] memory) {
        return allPools;
    }

    /// @notice Get pool address by index (for pagination)
    function getPoolByIndex(uint256 index) external view returns (address) {
        require(index < allPools.length, "Index out of bounds");
        return allPools[index];
    }

    /// @notice Get token pair for a given pool
    function getTokenPair(address pool) external view returns (address tokenA, address tokenB) {
        require(pool != address(0), "Invalid pool");
        require(isPool[pool], "Not a valid pool");
        ConstantProductAMM p = ConstantProductAMM(payable(pool));
        tokenA = p.tokenA();
        tokenB = p.tokenB();
    }

    /// @notice Update fee recipient for existing pool
    function updatePoolFeeRecipient(address poolAddress, address _feeRecipient) external onlyOwner {
        require(poolAddress != address(0), "Invalid pool");
        require(isPool[poolAddress], "Not a valid pool");
        ConstantProductAMM pool = ConstantProductAMM(payable(poolAddress));
        pool.setFeeRecipient(_feeRecipient);
        emit PoolFeeRecipientUpdated(poolAddress, _feeRecipient);
    }

    /// @notice Update fees for existing pool
    function updatePoolFees(address poolAddress, uint256 _devFeeBps, uint256 _feeBps) external onlyOwner {
        require(poolAddress != address(0), "Invalid pool");
        require(isPool[poolAddress], "Not a valid pool");
        ConstantProductAMM pool = ConstantProductAMM(payable(poolAddress));
        pool.setDevFeeBps(_devFeeBps);
        pool.setFeeBps(_feeBps);
        emit PoolFeesUpdated(poolAddress, _devFeeBps, _feeBps);
    }
}
