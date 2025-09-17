# 📜 SwapMateDEX — A Privacy-First DEX Powered by Zama FHE

> 💡 *Trade freely. Stay privately.*

SwapMateDEX is a next-generation **decentralized exchange (DEX)** built on Ethereum-compatible chains, integrating **Fully Homomorphic Encryption (FHE)** from [Zama Protocol](https://zama.ai) to enable private trading, liquidity provision, and yield farming — without sacrificing DeFi composability or security.

---

## 🎯 Vision

Empower users to participate in DeFi while keeping sensitive financial data — such as balances, rewards, and positions — **encrypted at rest and in use**. Only the user (or authorized systems) can decrypt their data, preserving transparency where needed and privacy where desired.

---

## 🧩 Core Features

### 🔄 AMM Swap Engine
- Constant Product AMM (`x * y = k`)
- Supports **ERC20 ↔ ERC20** and **ERC20 ↔ Native** (ETH, MATIC, etc.) via `address(0)`
- Dual-fee model:
  - `0.3%` → LP providers
  - `0.1%` → Protocol treasury (configurable)
- Slippage protection (`minAmountOut`, `deadline`)
- Price impact estimator for UIs

### 🏊‍♂️ Liquidity Pools
- Create or join pools for any token pair
- LP tokens minted proportionally to deposit size
- Withdraw anytime with proportional asset return
- Built-in minimal ERC20 LP token (transferable, approvable)

### 🏭 LP Farming & Staking
- Stake LP tokens to earn **$KANARI** rewards
- Linear reward accrual based on time and stake size
- Admin-controlled reward funding with duration
- Encrypted reward tracking via FHE (`euint64`)

### 🏗️ Automated Pool Factory
- Permissionless pool creation via `createPool(tokenA, tokenB)`
- Auto-deploys and configures AMM contracts
- Tracks all pools + bidirectional lookup
- Encrypted pool metadata for private analytics or governance flags

### 🔐 Zama FHE Integration
- **Encrypted Balances**: Store token balances as `euint64` — decryptable only by owner/user.
- **Encrypted Stakes & Rewards**: Farming positions and earnings remain private.
- **Encrypted Pool Metadata**: Attach private analytics, scores, or flags to pools.
- All encrypted values are set via owner/minter with cryptographic proof.

> ⚠️ *Encrypted values cannot be used in on-chain conditionals — unless using Zama’s FHE precompiles for ciphertext arithmetic.*

---

## 🌐 Benefits

- ✅ **Privacy by Default** — Sensitive data never exposed in plaintext on-chain.
- ✅ **Security Audited Design** — Uses OpenZeppelin, ReentrancyGuard, SafeERC20.
- ✅ **Institutional Friendly** — Hide capital allocation while remaining trustless.
- ✅ **Future-Proof** — Ready for encrypted governance, cross-chain farming, ZK+FHE hybrids.

---

## 📈 Use Cases

| User Profile | Use Case |
|--------------|----------|
| Retail Trader | Swap tokens without revealing wallet size or strategy |
| Yield Farmer | Stake LP tokens and earn rewards — privately |
| Institutional LP | Provide deep liquidity without exposing position |
| DAO / Analytics | Aggregate encrypted metrics for system health without exposing individual data |

---

## 🛠️ Tech Stack

- **Solidity**: `^0.8.30`
- **Libraries**:
  - OpenZeppelin Contracts
  - Zama FHE Lib (`FHE.sol`, `SepoliaConfig.sol`)
- **Testnet**: Ethereum Sepolia (FHE-enabled)
- **Frontend**: React + ethers.js + [Zama Client SDK](https://github.com/zama-ai/fhevm-client-sdk-js)

---

