# Kanari Token System

ระบบ Pool Management สำหรับ USDK และ Kanari tokens พร้อมกับฟีเจอร์การตั้งค่า free value

## Contracts

### USDK Token (`src/USDK.sol`)
- **Name**: USD Kanari
- **Symbol**: USDK  
- **Decimals**: 6 (เหมือน USDC)
- **Features**:
  - Mintable/Burnable stablecoin
  - Multi-minter support
  - Owner controls

### Kanari Token (`src/Kanari.sol`)
- **Name**: Kanari Token
- **Symbol**: KANARI
- **Decimals**: 18
- **Max Supply**: 100,000,000 KANARI
- **Features**:
  - Deflationary mechanism (1% burn on transfers)
  - Exclude addresses from burn
  - Mintable with max supply cap
  - Owner controls

### PoolManager (`src/PoolManager.sol`)
- จัดการ pools สำหรับ token pairs
- กำหนด free value สำหรับแต่ละ pool
- เฉพาะ owner เท่านั้นที่ตั้งค่า free value ได้

## การใช้งาน

### 1. รัน Tests
```bash
forge test -vv
```

### 2. Deploy Contracts
```bash
# สร้าง .env file
echo "PRIVATE_KEY=your_private_key_here" > .env

# Deploy
forge script script/DeploySystem.s.sol --rpc-url <RPC_URL> --broadcast
```

### 3. Interact กับ System
```bash
forge script script/InteractSystem.s.sol --rpc-url <RPC_URL> --broadcast
```

## ฟีเจอร์หลัก

1. **Pool Management**: สร้าง pools สำหรับ token pairs
2. **Free Value Setting**: กำหนดค่า free value สำหรับแต่ละ pool
3. **USDK Stablecoin**: สามารถ mint/burn ได้โดย authorized minters
4. **Kanari Deflationary**: มี burn mechanism 1% ในทุก transfer
5. **Owner Controls**: เฉพาะ owner ควบคุมระบบได้

## Contract Addresses (หลังจาก deploy)

- USDK: `TBD`
- Kanari: `TBD`  
- PoolManager: `TBD`

## การทดสอบ

```bash
# รัน tests ทั้งหมด
forge test

# รัน test เฉพาะ contract
forge test --match-contract PoolManagerTest

# รัน test พร้อม gas report
forge test --gas-report
```

## Architecture

```
PoolManager
├── addPool(tokenA, tokenB) → poolId
├── setFreeValue(poolId, value) → [onlyOwner]
└── getPool(poolId) → (tokenA, tokenB, freeValue, exists)

USDK (Stablecoin)
├── mint(to, amount) → [onlyMinter]
├── burn(amount)
└── Standard ERC20 functions

Kanari (Utility Token)  
├── transfer() → burns 1% automatically
├── setExcludedFromBurn(address, bool) → [onlyOwner]
├── setBurnRate(newRate) → [onlyOwner]
└── mint(to, amount) → [onlyMinter, max supply check]
```

## Example Usage

```solidity
// สร้าง pool
bytes32 poolId = poolManager.addPool(usdkAddress, kanariAddress);

// ตั้งค่า free value
poolManager.setFreeValue(poolId, 1000 * 10**6); // 1000 USDK

// ดูข้อมูล pool
(address tokenA, address tokenB, uint256 freeValue, bool exists) = poolManager.getPool(poolId);

// Mint tokens
usdk.mint(userAddress, 5000 * 10**6); // 5000 USDK
kanari.mint(userAddress, 10000 * 10**18); // 10000 KANARI
```
