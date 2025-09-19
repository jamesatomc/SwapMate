# SwapMate DEX Deployment Summary

## 🎉 Deployment Successful on Alpen Labs Testnet

### 📝 Contract Addresses

#### Core Tokens
- **KANARI Token**: `0xd644E59B6D64e5eA67B723BD99Eb7de00417BdDf`
- **USDC Token**: `0x5B45Cd9C1d75aF9a445bb208f294e2bF66d810B4`

#### DEX Infrastructure  
- **DEX Factory**: `0x67E4a92625bc865354e94fc55B203AEFb547DE6e`

#### Liquidity Pools
- **KANARI_NATIVE_POOL**: `0x8621B976717265327dE0e9bfE90Ba6aA75A7EB03` 

#### Farming & Staking
- **Farming Contract**: `0xc1Ed3D3BEe8e21C21cF1beba027b68aB35daBA81`

### ⚙️ Configuration Details

- **Fee Recipient**: `0xC88C539aa6f67daeDaeA7aff75FE1F8848d6CeC2`
- **Default DEV Fee**: 0.1% (10 basis points)
- **Default Trading Fee**: 0.3% (30 basis points)
- **Initial Token Supply**:
  - KANARI: 6,000,000 tokens (minted to pool)

### 🚀 Next Steps

1. **Add Liquidity**: Use the pool contract to add initial liquidity
2. **Configure Farming Rewards**: 
   ```solidity
   // Call on farming contract (0x2e57223CDA40497e6D792ffFDB7879dD7894845d)
   fundRewards(rewardAmount, durationInSeconds)
   ```
3. **Frontend Integration**: Use these contract addresses in your frontend application

### 📋 Deployment Commands Used

```bash
# Main contracts deployment
forge script script/DeployDEX.s.sol --fork-url https://ethereum-sepolia-rpc.publicnode.com --ledger --broadcast

# Factory deployment (with optimization)
forge script script/DeployDEX_v2.s.sol:DeployDEX_v2 --rpc-url https://ethereum-sepolia-rpc.publicnode.com --ledger --broadcast
```

### 🔗 Network Information
- **Network**: Ethereum Sepolia
- **Chain ID**: 11155111
- **RPC URL**: https://ethereum-sepolia-rpc.publicnode.com
