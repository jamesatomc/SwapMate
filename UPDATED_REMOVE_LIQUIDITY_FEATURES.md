# Updated RemoveLiquidityPage.tsx - Multi-Pool Support

## ✅ What's Been Updated

### 1. **Multi-Pool Support**
- Added pool selection dropdown with all 3 pools:
  - 🔄 **KANARI/USDK** - Main trading pair
  - 🔄 **KANARI/sBTC** - KANARI with native coin (เหรียญหลัก)
  - 🔄 **USDK/sBTC** - USDK with native coin (เหรียญหลัก)

### 2. **Native Token (เหรียญหลัก) Integration**
- ✅ Support for native sBTC in liquidity removal
- ✅ Automatic detection of native vs ERC20 tokens
- ✅ Proper decimal handling for different token types
- ✅ Native balance tracking and display

### 3. **Enhanced UI Features**
- 🎨 **Pool Selector Dropdown** - Beautiful visual selection of pools
- 🎨 **Token Pair Icons** - Overlapping token icons showing the pair
- 🎨 **Pool Status Indicators** - Shows if pool is deployed or loading
- 🎨 **Dynamic Form Updates** - Form resets when switching pools
- 🎨 **Click Outside to Close** - Better UX for dropdown

### 4. **Smart Contract Integration**
- 🔗 **Dynamic Pool Address** - Reads from selected pool
- 🔗 **Pool Validation** - Checks if pool is deployed
- 🔗 **Loading States** - Shows loading while fetching data
- 🔗 **Error Handling** - Graceful handling of undeployed pools

### 5. **Multi-Token Support**
- 💰 **KANARI Token** (18 decimals) - Main token
- 💰 **USDK Token** (6 decimals) - Stablecoin 
- 💰 **Native sBTC** (18 decimals) - เหรียญหลัก (Main coin)

## 🚀 Key Features Added

### Pool Selection Interface
```typescript
// Users can now select from 3 different pools
const POOLS = {
  'KANARI-USDK': { ... },    // KANARI/USDK pair
  'KANARI-NATIVE': { ... },  // KANARI/เหรียญหลัก pair  
  'USDK-NATIVE': { ... }     // USDK/เหรียญหลัก pair
}
```

### Native Token Handling
```typescript
// Automatic detection and handling of native tokens
const getTokenBalance = (tokenKey: TokenKey) => {
  switch (tokenKey) {
    case 'NATIVE': return nativeBalance?.value || BigInt(0);  // เหรียญหลัก
    case 'USDK': return usdkBalance || BigInt(0);
    case 'KANARI': return kanariBalance || BigInt(0);
  }
}
```

### Dynamic Pool Reading
```typescript
// Reads from the selected pool address
const { data: lpBalance } = useReadContract({
  address: poolAddress as Address,  // Dynamic based on selection
  functionName: 'balanceOf',
  query: { enabled: poolAddress !== '0x000...' }  // Only when deployed
});
```

## 💡 User Experience Improvements

1. **Visual Pool Selection** - Users see token pair icons and descriptions
2. **Status Feedback** - Clear indication of pool availability
3. **Form Validation** - Prevents actions on undeployed pools  
4. **Loading States** - Shows when data is being fetched
5. **Responsive Design** - Works on all screen sizes

## 🎯 How Users Interact with เหรียญหลัก

### Step 1: Select Pool with Native Token
- Choose "KANARI/sBTC" or "USDK/sBTC" from dropdown
- See native token icon (₿) in the interface

### Step 2: View LP Position  
- See your LP tokens for the selected pool
- View your share of KANARI and sBTC in the pool

### Step 3: Remove Liquidity
- Set percentage or LP amount to remove
- See expected KANARI and sBTC amounts to receive
- Confirm transaction with slippage protection

### Step 4: Receive Tokens
- Get proportional KANARI and native sBTC back
- Native sBTC sent directly to wallet (no unwrapping needed)

## 🔧 Technical Implementation

### Pool Address Management
- Automatically switches contract addresses based on pool selection
- Validates pool deployment before allowing interactions
- Graceful handling of zero addresses

### Token Decimal Handling
- KANARI: 18 decimals
- USDK: 6 decimals (corrected from 18)
- Native sBTC: 18 decimals

### State Management
- Form resets when switching pools
- Loading states for better UX
- Error boundaries for failed transactions

The RemoveLiquidityPage now fully supports all three liquidity pools including the เหรียญหลัก (native token) pairs! 🎉
