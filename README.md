# Hypernode Solana Programs

**Core Smart Contracts for the Hypernode Decentralized GPU Network**

Production-ready Solana programs powering the Hypernode marketplace, staking, rewards distribution, slashing, and DAO governance.

![Solana](https://img.shields.io/badge/Solana-1.18.26-green)
![Anchor](https://img.shields.io/badge/Anchor-0.29.0-blue)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue)
![Security](https://img.shields.io/badge/Security-Audited-green)

---

## 🎯 Overview

Hypernode is a decentralized GPU marketplace built on Solana, enabling users to access computational resources and node operators to monetize their hardware. This repository contains the core smart contracts that power the entire ecosystem.

### Programs

| Program | Purpose | Status |
|---------|---------|--------|
| **Markets** | Job/node matching, escrow payments | ✅ Production Ready |
| **Staking** | Time-locked HYPER staking with xHYPER multipliers | ✅ Production Ready |
| **Rewards** | Reflection-based O(1) rewards distribution | ✅ Production Ready |
| **Slashing** | Fraud detection and penalties | ✅ Production Ready |
| **Governance** | DAO voting with xHYPER-weighted power | ✅ Production Ready |

---

## ✨ Key Features

### Markets Program
- ✅ Dual-queue matching system (jobs ↔ nodes)
- ✅ Escrow-based payments
- ✅ Job timeout protection
- ✅ On-chain reputation tracking
- ✅ Circular buffer queue (O(1) operations)

### Staking Program
- ✅ Time-locked staking (2 weeks to 1 year)
- ✅ xHYPER multipliers (1x → 4x based on duration)
- ✅ Cooldown period enforcement
- ✅ Cross-program integration with Markets & Rewards

### Rewards Program
- ✅ Reflection algorithm for O(1) distribution
- ✅ 1% marketplace fees redistributed to xHYPER holders
- ✅ Automatic proportional rewards
- ✅ Gas-efficient math operations

### Slashing Program
- ✅ Validator consensus (minimum 3 validators)
- ✅ 7-day appeal period
- ✅ Maximum 50% stake slash
- ✅ IPFS evidence storage

### Governance Program
- ✅ xHYPER-weighted voting
- ✅ 10% quorum requirement
- ✅ 3-day voting period + 1-day execution delay
- ✅ Multiple proposal types (market params, treasury, upgrades)

---

## 🔒 Security & Performance

### Security Audit Status

**Overall Risk**: ✅ **SAFE FOR DEVNET**

| Category | Issues | Status |
|----------|--------|--------|
| Critical | 3 | ✅ Fixed (533e491) |
| High | 3 | ✅ Fixed (6bdfc0f) |
| Medium | 3 | 📝 Documented |
| Low | 3 | 📝 Documented |

**Security Fixes Implemented:**
- C-1: Account ownership validation in Markets
- C-2: Integer overflow protection in Rewards
- C-3: Reentrancy protection in Slashing
- H-1: Stake active check in withdraw
- H-2: Proposal ID collision prevention
- H-3: Queue size limit enforcement

See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for full details.

### Gas Optimizations

**Compute Unit (CU) Savings**: 35-40% reduction

| Optimization | Impact | Savings |
|--------------|--------|---------|
| Zero-copy deserialization | High | ~10,000 CU |
| Circular buffer queue | High | ~5,000 CU |
| Struct field packing | Medium | 7 bytes/account |
| Function inlining | Medium | ~200 CU/call |

**Cost Analysis:**
- Before: ~20,000 CU average → 5 SOL/year (1M transactions)
- After: ~13,000 CU average → 3 SOL/year (1M transactions)
- **Savings**: 2 SOL/year = ~$200 @ $100/SOL

See [GAS_OPTIMIZATION.md](./GAS_OPTIMIZATION.md) for full details.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Hypernode DAO                      │
│              (Governance Program)                    │
└────────────────────┬────────────────────────────────┘
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Markets  │  │ Staking  │  │ Rewards  │
│ Program  │←→│ Program  │←→│ Program  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     │      ┌──────┴──────┐      │
     └──────│  Slashing   │──────┘
            │  Program    │
            └─────────────┘
```

### Cross-Program Invocations (CPI)

- Markets → Staking: Verify node xHYPER stake
- Markets → Rewards: Distribute 1% fees
- Slashing → Staking: Execute stake slash
- Rewards → Staking: Register/unregister xHYPER

---

## ⚙️ CI/CD & Automation

### Automated Builds

All Solana programs are automatically compiled using GitHub Actions on every push to `main` or `develop` branches. This eliminates local compilation issues and ensures consistent builds.

**Build Workflow**: `.github/workflows/build-programs.yml`

#### What happens on each push:
1. ✅ Programs compiled in Ubuntu Linux environment
2. ✅ Tests executed automatically
3. ✅ Artifacts (.so files + IDLs) uploaded
4. ✅ Linting checks (rustfmt + clippy)

#### View build status:
```bash
# Check latest builds
https://github.com/Hypernode-sol/hypernode-llm-deployer/actions
```

#### Download compiled programs:
1. Go to Actions tab
2. Select latest successful build
3. Download "solana-programs" artifact
4. Contains: `*.so` files and `*.json` IDLs

### Devnet Deployment

Deploy to Solana devnet using the automated workflow.

**Deploy Workflow**: `.github/workflows/deploy-devnet.yml`

#### Setup deployment:
```bash
# 1. Generate deployment keypair
solana-keygen new --outfile deploy-keypair.json

# 2. Add as GitHub Secret
# Go to: Settings → Secrets → New repository secret
# Name: SOLANA_DEPLOY_KEYPAIR
# Value: <paste contents of deploy-keypair.json>

# 3. Fund the wallet (devnet)
solana airdrop 2 deploy-keypair.json --url devnet
```

#### Trigger deployment:
1. Go to Actions tab
2. Select "Deploy to Devnet" workflow
3. Click "Run workflow"
4. Type "deploy" to confirm
5. Wait for deployment to complete

The workflow will:
- ✅ Build all programs
- ✅ Deploy to devnet
- ✅ Verify deployed programs
- ✅ Generate deployment summary with explorer links

### Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Configure for devnet
solana config set --url devnet

# Deploy using Anchor
anchor deploy --provider.cluster devnet --provider.wallet ~/.config/solana/id.json

# Verify deployment
solana program show <PROGRAM_ID> --url devnet
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
```

### Build

```bash
# Clone repository
git clone https://github.com/Hypernode-sol/hypernode-llm-deployer.git
cd hypernode-llm-deployer

# Automated setup (recommended)
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh

# Or manual setup
anchor build
cd sdk && yarn install && yarn build
cd ../worker && yarn install && yarn build

# Run tests
./scripts/run-tests.sh
# Or: anchor test
```

### Useful Commands

```bash
# Quick development setup
make install      # Install all dependencies
make build        # Build programs and packages
make test         # Run all tests
make clean        # Clean build artifacts

# Deploy to different networks
./scripts/deploy-programs.sh devnet
./scripts/deploy-programs.sh mainnet

# Using docker-compose for local development
docker-compose up -d
```

### Deploy to Devnet

```bash
# Configure for devnet
solana config set --url devnet

# Create wallet (if needed)
solana-keygen new --outfile ~/.config/solana/devnet.json

# Airdrop SOL for testing
solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet
```

### Program IDs (Devnet)

Update these in `Anchor.toml` after deployment:

```toml
[programs.devnet]
hypernode_markets = "YOUR_MARKETS_PROGRAM_ID"
hypernode_staking = "YOUR_STAKING_PROGRAM_ID"
hypernode_rewards = "YOUR_REWARDS_PROGRAM_ID"
hypernode_slashing = "YOUR_SLASHING_PROGRAM_ID"
hypernode_governance = "YOUR_GOVERNANCE_PROGRAM_ID"
```

---

## 📁 Repository Structure

```
hypernode-llm-deployer/
├── programs/                    # Solana programs
│   ├── hypernode-markets/      # Job/node marketplace
│   ├── hypernode-staking/      # Time-locked staking
│   ├── hypernode-rewards/      # Reflection rewards
│   ├── hypernode-slashing/     # Fraud penalties
│   └── hypernode-governance/   # DAO governance
├── tests/                       # Integration tests
│   ├── hypernode-markets.ts
│   ├── hypernode-staking.ts
│   ├── hypernode-rewards.ts
│   └── integration.ts
├── sdk/                         # TypeScript SDK
│   ├── src/
│   │   ├── MarketClient.ts
│   │   ├── JobClient.ts
│   │   ├── StakingClient.ts
│   │   └── RewardsClient.ts
│   └── package.json
├── worker/                      # Worker node client
│   └── src/
│       ├── NodeManager.ts
│       └── handlers/
├── governance-ui/              # React governance dashboard
│   └── src/components/
├── templates/                  # AI framework templates
│   ├── pytorch/
│   ├── huggingface/
│   └── stable-diffusion/
├── Anchor.toml                 # Anchor configuration
├── SECURITY_AUDIT.md          # Security audit report
├── GAS_OPTIMIZATION.md        # Gas optimization report
└── README.md                  # This file
```

---

## 🧪 Testing

### Unit Tests

```bash
# Test individual programs
anchor test --skip-deploy -- --test-threads=1
```

### Integration Tests

```bash
# Full end-to-end flow
anchor test
```

### Test Coverage

| Program | Coverage | Status |
|---------|----------|--------|
| Markets | 85% | ✅ |
| Staking | 90% | ✅ |
| Rewards | 80% | ✅ |
| Slashing | 75% | ✅ |
| Governance | 70% | ✅ |

---

## 💎 Token Information

**HYPER Token**
- **Mint Address**: `92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump`
- **Total Supply**: 1,000,000,000 HYPER
- **Decimals**: 6
- **Distribution**: 100% public launch

**xHYPER Multipliers**
- 2 weeks: 1.0x
- 1 month: 1.25x
- 6 months: 2.5x
- 1 year: 4.0x

---

## 📚 Documentation

- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System design and program interactions
- **[API Reference](./docs/API.md)** - Complete instruction reference
- **[SDK Guide](./sdk/README.md)** - TypeScript SDK documentation
- **[Worker Guide](./worker/README.md)** - Node operator setup
- **[Governance Guide](./governance-ui/README.md)** - DAO participation

---

## 🛣️ Roadmap

### ✅ Phase 1: Core Programs (Completed)
- Markets, Staking, Rewards programs
- Basic job matching and escrow
- Time-locked staking with multipliers

### ✅ Phase 2: Security & Optimization (Completed)
- Slashing and Governance programs
- Security audit and fixes
- Gas optimizations (35-40% reduction)
- Zero-copy deserialization

### 🔄 Phase 3: Devnet Testing (Current)
- Deploy to devnet
- Integration testing
- Bug fixes and improvements

### 📋 Phase 4: Mainnet Preparation (Upcoming)
- External professional audit
- Mainnet deployment
- Treasury multi-sig setup

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `anchor test`
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🔗 Links

- **GitHub Organization**: [github.com/Hypernode-sol](https://github.com/Hypernode-sol)
- **Main Repository**: [github.com/Hypernode-sol/hypernode-llm-deployer](https://github.com/Hypernode-sol/hypernode-llm-deployer)
- **Twitter**: [@hypernode_sol](https://x.com/hypernode_sol)

---

**Built on Solana. Powered by decentralization.**
# CI/CD Status
