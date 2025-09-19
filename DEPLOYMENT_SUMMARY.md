# SwapMate DEX Deployment Summary

## 🎉 Deployment Successful on Alpen Labs Testnet

### 📝 Contract Addresses

#### Core Tokens
- **KANARI Token**: `0xE34e4567b9327ab04b6dEAeF603b3a1F1D5Ec463`
- **USDC Token**: `0xF24bE8Ee66452c5B579b4e615a1b56384a66ab2B`

#### DEX Infrastructure  
- **DEX Factory**: `0xF171A4EEe205DABd7706Dfeb9da1130834d4A735`

#### Liquidity Pools
- **KANARI_NATIVE_POOL**: `0xff1f2013553Abcf3E0a601b029f513AaF49067B9` 

#### Farming & Staking
- **Farming Contract**: `0xBCe526f54e88120C91Df7097F380C0F2b09BC5D8`

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
