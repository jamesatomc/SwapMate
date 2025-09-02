# DEX Liquidity Pools Setup

This document explains how to set up and manage liquidity pools for the KANARI/USDK DEX with support for the main coin (native token).

## Available Liquidity Pools

The DEX now supports three main liquidity pools:

1. **KANARI/USDK Pool** - Main trading pair between KANARI token and USDK stablecoin
2. **KANARI/Native Pool** - KANARI token paired with the native blockchain coin (e.g., sBTC, ETH, BNB)
3. **USDK/Native Pool** - USDK stablecoin paired with the native blockchain coin

## Deployment

### 1. Deploy All Contracts and Add Initial Liquidity

Run the main deployment script to deploy all tokens and pools with initial liquidity:

```bash
forge script script/DeployDEX.s.sol --rpc-url YOUR_RPC_URL --private-key YOUR_PRIVATE_KEY --broadcast
```

This script will:
- Deploy USDK token contract
- Deploy KANARI token contract
- Deploy three AMM pool contracts
- Mint initial tokens
- Add initial liquidity to all three pools

### 2. Add Additional Liquidity (Optional)

If you want to add more liquidity after deployment, update the addresses in `AddLiquidityHelper.s.sol` and run:

```bash
forge script script/AddLiquidityHelper.s.sol --rpc-url YOUR_RPC_URL --private-key YOUR_PRIVATE_KEY --broadcast
```

## Pool Features

### Native Token Support

The AMM pools support native blockchain tokens (ETH, BNB, sBTC, etc.) by using `address(0)` as the token address. When adding liquidity or swapping with native tokens:

- Send the native token amount as `msg.value`
- The contract automatically handles native token transfers
- No approval needed for native tokens

### Liquidity Provider (LP) Tokens

Each pool mints LP tokens representing your share of the liquidity:
- LP tokens are ERC20 compatible
- Burn LP tokens to withdraw your proportional share
- LP tokens earn trading fees from swaps

### Trading Fees

- Default fee: 0.3% (30 basis points)
- Fees are collected from each swap
- Fees are distributed proportionally to LP token holders

## Smart Contract Functions

### Adding Liquidity

```solidity
function addLiquidity(
    uint256 amountA,
    uint256 amountB,
    uint256 minAmountA,
    uint256 minAmountB,
    uint256 deadline
) external payable returns (uint256 lpMinted)
```

For native token pairs, send the native amount as `msg.value`.

### Removing Liquidity

```solidity
function removeLiquidity(
    uint256 lpAmount,
    uint256 minAmountA,
    uint256 minAmountB,
    uint256 deadline
) external returns (uint256 amountA, uint256 amountB)
```

### Swapping Tokens

```solidity
function swap(
    address tokenIn,
    uint256 amountIn,
    uint256 minAmountOut,
    uint256 deadline
) external payable returns (uint256 amountOut)
```

Use `address(0)` for native token swaps and send native amount as `msg.value`.

### Viewing Pool Information

```solidity
function getReserves() external view returns (uint256 reserveA, uint256 reserveB)
function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256 amountOut)
function getPriceImpact(uint256 amountIn, address tokenIn) external view returns (uint256 impactBps)
```

## Frontend Integration

### Pool Selection

The frontend now supports multiple pools. Users can:
1. Select which pool to interact with
2. See reserves and LP token supply for each pool
3. Add/remove liquidity from any pool
4. Swap tokens within each pool

### Native Token Handling

The frontend automatically detects native token transactions and:
- Shows native token balance
- Handles native token approvals (not needed)
- Displays native token in swap/liquidity interfaces

## Security Considerations

1. **Slippage Protection**: Always set appropriate minimum amounts
2. **Deadline**: Set reasonable transaction deadlines
3. **Native Token**: Double-check native token amounts match `msg.value`
4. **Approvals**: ERC20 tokens require approval before adding liquidity
5. **Pool Reserves**: Check pool reserves before large trades to avoid high slippage

## Testing

Test the deployment on a testnet first:

```bash
# Test compilation
forge build

# Test deployment simulation
forge script script/DeployDEX.s.sol

# Run tests
forge test

# Test with testnet
forge script script/DeployDEX.s.sol --rpc-url TESTNET_RPC_URL --private-key YOUR_TEST_PRIVATE_KEY --broadcast
```

## Pool Management

### Owner Functions

Pool owners can:
- Set trading fees (max 5%)
- Add/remove minters for tokens
- Exclude addresses from burn mechanisms (KANARI token)

### Monitoring

Monitor your pools:
- Check reserves regularly
- Monitor LP token supply
- Track trading volume and fees
- Watch for large trades that might affect prices

## Example Usage

### Adding Liquidity to KANARI/Native Pool

```javascript
// Approve KANARI tokens
await kanariContract.approve(poolAddress, kanariAmount);

// Add liquidity (send native token as value)
await poolContract.addLiquidity(
  kanariAmount,
  nativeAmount,
  minKanariAmount,
  minNativeAmount,
  deadline,
  { value: nativeAmount }
);
```

### Swapping Native to KANARI

```javascript
await poolContract.swap(
  "0x0000000000000000000000000000000000000000", // address(0) for native
  nativeAmount,
  minKanariOut,
  deadline,
  { value: nativeAmount }
);
```

This setup provides a complete multi-pool DEX with support for the main blockchain's native token alongside KANARI and USDK tokens.
