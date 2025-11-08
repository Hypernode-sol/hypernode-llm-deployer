#!/usr/bin/bash
# Auto-fix Cargo.lock version for Solana BPF compatibility
if [ -f "Cargo.lock" ]; then
    sed -i 's/^version = 4$/version = 3/' Cargo.lock
    echo "✓ Fixed Cargo.lock version to 3"
fi
