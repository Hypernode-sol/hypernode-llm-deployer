#!/bin/bash
# Setup development environment for Hypernode

set -e

echo "🚀 Setting up Hypernode development environment..."

# Check for required tools
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi

if ! command -v rustc &> /dev/null; then
    echo "❌ Rust not found. Please install Rust from https://rustup.rs"
    exit 1
fi

if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Installing..."
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
fi

if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor not found. Installing..."
    cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli --locked
fi

echo "✅ All prerequisites installed!"

# Setup Solana
echo ""
echo "🔧 Configuring Solana..."
solana config set --url localhost
solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json --force

# Install dependencies
echo ""
echo "📦 Installing dependencies..."

echo "  - SDK dependencies..."
cd sdk && yarn install && cd ..

echo "  - Worker dependencies..."
cd worker && yarn install && cd ..

# Build projects
echo ""
echo "🔨 Building projects..."

echo "  - Building Solana programs..."
anchor build

echo "  - Building SDK..."
cd sdk && yarn build && cd ..

echo "  - Building Worker..."
cd worker && yarn build && cd ..

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "📚 Next steps:"
echo "  1. Start local validator: solana-test-validator"
echo "  2. Deploy programs: anchor deploy"
echo "  3. Run tests: anchor test"
echo ""
