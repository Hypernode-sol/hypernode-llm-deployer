#!/bin/bash
# Deploy Hypernode programs to Solana

set -e

CLUSTER=${1:-devnet}

echo "🚀 Deploying Hypernode programs to $CLUSTER..."

# Set cluster
echo "🔧 Setting cluster to $CLUSTER..."
solana config set --url $CLUSTER

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "💰 Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo "⚠️  Low balance! You may need more SOL."
    if [ "$CLUSTER" = "devnet" ]; then
        echo "💸 Requesting airdrop..."
        solana airdrop 2
    fi
fi

# Build programs
echo ""
echo "🔨 Building programs..."
anchor build

# Deploy
echo ""
echo "📤 Deploying programs..."
anchor deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Program IDs:"
solana program show $(solana address -k target/deploy/hypernode_markets-keypair.json) || echo "  - Markets: Not deployed"
solana program show $(solana address -k target/deploy/hypernode_staking-keypair.json) || echo "  - Staking: Not deployed"
solana program show $(solana address -k target/deploy/hypernode_rewards-keypair.json) || echo "  - Rewards: Not deployed"
solana program show $(solana address -k target/deploy/hypernode_slashing-keypair.json) || echo "  - Slashing: Not deployed"
solana program show $(solana address -k target/deploy/hypernode_governance-keypair.json) || echo "  - Governance: Not deployed"

echo ""
echo "🔗 View on Solana Explorer:"
echo "  https://explorer.solana.com/?cluster=$CLUSTER"
echo ""
