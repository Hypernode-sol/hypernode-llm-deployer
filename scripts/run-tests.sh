#!/bin/bash
# Run all Hypernode tests

set -e

echo "🧪 Running Hypernode test suite..."

# Start local validator in background
echo ""
echo "🔧 Starting local Solana test validator..."
solana-test-validator --reset &
VALIDATOR_PID=$!

# Wait for validator to be ready
sleep 5

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping test validator..."
    kill $VALIDATOR_PID 2>/dev/null || true
}
trap cleanup EXIT

# Run Anchor tests
echo ""
echo "📝 Running Anchor program tests..."
anchor test --skip-local-validator || TEST_FAILED=1

# Run SDK tests
echo ""
echo "📝 Running SDK tests..."
cd sdk
yarn test || TEST_FAILED=1
cd ..

# Run Worker tests
echo ""
echo "📝 Running Worker tests..."
cd worker
yarn test || TEST_FAILED=1
cd ..

echo ""
if [ -n "$TEST_FAILED" ]; then
    echo "❌ Some tests failed!"
    exit 1
else
    echo "✅ All tests passed!"
fi
