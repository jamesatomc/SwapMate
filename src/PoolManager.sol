// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @notice Minimal PoolManager to register pools (tokenA + tokenB) and set a free value per pool.
contract PoolManager {
    struct Pool {
        address tokenA;
        address tokenB;
        uint256 freeValue;
        bool exists;
    }

    address public owner;
    mapping(bytes32 => Pool) public pools;
    bytes32[] public poolIds;

    event PoolAdded(bytes32 indexed id, address tokenA, address tokenB);
    event FreeValueSet(bytes32 indexed id, uint256 freeValue);

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
        pools[id] = Pool({tokenA: a, tokenB: b, freeValue: 0, exists: true});
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

    /// @notice Convenience getter: free value for a token pair.
    function freeValueOf(address a, address b) external view returns (uint256) {
        return pools[poolIdFor(a, b)].freeValue;
    }
}
