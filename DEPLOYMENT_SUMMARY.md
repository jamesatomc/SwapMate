# SwapMate DEX Deployment Summary

## 🎉 Deployment Successful on Alpen Labs Testnet

### 📝 Contract Addresses

#### Core Tokens
- **KANARI Token**: `0x70C79817a33b764BC04F1c423C61d484fAE38624`
- **USDC Token**: `0xcC11f370fe6126b36D634FC1D2CCbC1F72599199`

#### DEX Infrastructure  
- **DEX Factory**: `0x84d549dD7006c96C8559b4b373A7653AEC9cD67e`
- **KANARI/USDC Pool**: `0xD1bF50a5a67466c2000b3Bbe6dbF762C795CA8a5`
- **KANARI_NATIVE_POOL**: `0x1e953FbFca405F46aa8EF3C4079F1200b4d0634b`
- **USDC_NATIVE_POOL**: `0x5139292E4EA267fce9F60c046eB12Eb7533144E8`  

#### Farming & Staking
- **Farming Contract**: `0x2e57223CDA40497e6D792ffFDB7879dD7894845d`

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
forge script script/DeployDEX.s.sol --fork-url https://rpc.testnet.alpenlabs.io --ledger --broadcast

# Factory deployment (with optimization)
forge script script/DeployDEXFactory.s.sol --fork-url https://rpc.testnet.alpenlabs.io --ledger --broadcast
```

### 🔗 Network Information
- **Network**: Alpen Labs Testnet
- **Chain ID**: 2892
- **RPC URL**: https://rpc.testnet.alpenlabs.io
