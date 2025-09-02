#!/bin/bash

# DEX Deployment and Testing Script
# This script helps deploy and test the multi-pool DEX system

set -e

echo "🚀 DEX Multi-Pool Deployment Script"
echo "==================================="

# Check if required parameters are provided
if [ $# -lt 2 ]; then
    echo "Usage: $0 <RPC_URL> <PRIVATE_KEY> [network_name]"
    echo "Example: $0 https://rpc.testnet.example.com 0x123... testnet"
    exit 1
fi

RPC_URL=$1
PRIVATE_KEY=$2
NETWORK_NAME=${3:-"custom"}

echo "📋 Configuration:"
echo "RPC URL: $RPC_URL"
echo "Network: $NETWORK_NAME"
echo "Private Key: ${PRIVATE_KEY:0:10}..."
echo ""

# Build contracts
echo "🔨 Building contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Deploy contracts and add initial liquidity
echo "🚀 Deploying DEX contracts..."
DEPLOY_OUTPUT=$(forge script script/DeployDEX.s.sol --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --broadcast 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "✅ Deployment successful!"
echo ""

# Extract contract addresses from output
echo "📝 Extracting contract addresses..."
USDK_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "USDK Token:" | awk '{print $3}')
KANARI_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "KANARI Token:" | awk '{print $3}')
KANARI_USDK_POOL=$(echo "$DEPLOY_OUTPUT" | grep "KANARI/USDK Pool:" | awk '{print $3}')
KANARI_NATIVE_POOL=$(echo "$DEPLOY_OUTPUT" | grep "KANARI/Native Pool:" | awk '{print $3}')
USDK_NATIVE_POOL=$(echo "$DEPLOY_OUTPUT" | grep "USDK/Native Pool:" | awk '{print $3}')

echo "🎯 Deployed Contract Addresses:"
echo "USDK Token: $USDK_ADDRESS"
echo "KANARI Token: $KANARI_ADDRESS"
echo "KANARI/USDK Pool: $KANARI_USDK_POOL"
echo "KANARI/Native Pool: $KANARI_NATIVE_POOL"
echo "USDK/Native Pool: $USDK_NATIVE_POOL"
echo ""

# Save addresses to file
CONFIG_FILE="deployed_addresses_${NETWORK_NAME}.json"
cat > "$CONFIG_FILE" << EOF
{
  "network": "$NETWORK_NAME",
  "rpc_url": "$RPC_URL",
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contracts": {
    "USDK": "$USDK_ADDRESS",
    "KANARI": "$KANARI_ADDRESS",
    "KANARI_USDK_POOL": "$KANARI_USDK_POOL",
    "KANARI_NATIVE_POOL": "$KANARI_NATIVE_POOL",
    "USDK_NATIVE_POOL": "$USDK_NATIVE_POOL"
  }
}
EOF

echo "💾 Contract addresses saved to: $CONFIG_FILE"
echo ""

# Update frontend configuration
FRONTEND_CONFIG="from-end/src/lib/contracts.ts"
if [ -f "$FRONTEND_CONFIG" ]; then
    echo "🔄 Updating frontend configuration..."
    
    # Create backup
    cp "$FRONTEND_CONFIG" "${FRONTEND_CONFIG}.backup"
    
    # Update addresses in the frontend config
    sed -i.tmp "s|USDK: \".*\"|USDK: \"$USDK_ADDRESS\"|g" "$FRONTEND_CONFIG"
    sed -i.tmp "s|KANARI: \".*\"|KANARI: \"$KANARI_ADDRESS\"|g" "$FRONTEND_CONFIG"
    sed -i.tmp "s|KANARI_USDK_POOL: \".*\"|KANARI_USDK_POOL: \"$KANARI_USDK_POOL\"|g" "$FRONTEND_CONFIG"
    sed -i.tmp "s|KANARI_NATIVE_POOL: \".*\"|KANARI_NATIVE_POOL: \"$KANARI_NATIVE_POOL\"|g" "$FRONTEND_CONFIG"
    sed -i.tmp "s|USDK_NATIVE_POOL: \".*\"|USDK_NATIVE_POOL: \"$USDK_NATIVE_POOL\"|g" "$FRONTEND_CONFIG"
    
    # Clean up temp files
    rm -f "${FRONTEND_CONFIG}.tmp"
    
    echo "✅ Frontend configuration updated!"
else
    echo "⚠️  Frontend configuration not found at: $FRONTEND_CONFIG"
fi

echo ""

# Run basic tests
echo "🧪 Running basic tests..."
forge test --match-contract "ConstantProductAMM"

if [ $? -eq 0 ]; then
    echo "✅ Tests passed!"
else
    echo "⚠️  Some tests failed, but deployment was successful"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "📋 Next Steps:"
echo "1. Update your frontend with the new contract addresses"
echo "2. Test the pools on the deployed network"
echo "3. Add additional liquidity if needed"
echo "4. Monitor pool performance and trading activity"
echo ""
echo "🔗 Useful Commands:"
echo "- Check pool reserves: forge script script/AddLiquidityHelper.s.sol:AddLiquidityHelper --sig 'getPoolInfo()' --rpc-url $RPC_URL"
echo "- Add more liquidity: Update AddLiquidityHelper.s.sol addresses and run deployment"
echo ""
echo "📁 Configuration saved in: $CONFIG_FILE"
echo "🔧 Frontend config: $FRONTEND_CONFIG"
