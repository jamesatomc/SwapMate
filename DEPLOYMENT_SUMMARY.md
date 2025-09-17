# SwapMate DEX Deployment Summary

## 🎉 Deployment Successful on Alpen Labs Testnet

### 📝 Contract Addresses

#### Core Tokens
- **KANARI Token**: `0x227e2A88c6258EADf9016a1C69c16e176A9D5490`
- **USDC Token**: `0x45b7b270049C3a3436390728499fC5A9438b32E8`

#### DEX Infrastructure  
- **DEX Factory**: `0xf393ec4e9ac8ad1f780cd7d30FFE9F7249004FB8`
- **KANARI_NATIVE_POOL**: `0x8B0DBa210C4d7189505A2BE400203ebCb635aC29` 

#### Farming & Staking
- **Farming Contract**: `0x66a317555768F1CfCeb1cF962Fe1F1103eA8B143`

### ⚙️ Configuration Details

- **Fee Recipient**: `0xC88C539aa6f67daeDaeA7aff75FE1F8848d6CeC2`
- **Default DEV Fee**: 0.1% (10 basis points)
- **Default Trading Fee**: 0.3% (30 basis points)
- **Initial Token Supply**:
  - KANARI: 1,000,000 tokens (minted to deployer)
  - USDC: 100,000 tokens (minted to deployer)

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
