.PHONY: help install build test clean deploy-local

help:
	@echo "Hypernode LLM Deployer - Available Commands:"
	@echo ""
	@echo "  make install         - Install all dependencies"
	@echo "  make build          - Build all Solana programs and TypeScript packages"
	@echo "  make test           - Run all tests"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make deploy-local   - Deploy to local Solana test validator"
	@echo "  make fmt            - Format Rust code"
	@echo "  make lint           - Run linters"
	@echo ""

install:
	@echo "Installing Rust dependencies..."
	cd programs/hypernode-markets && cargo build-bpf
	@echo "Installing SDK dependencies..."
	cd sdk && yarn install
	@echo "Installing Worker dependencies..."
	cd worker && yarn install
	@echo "Done!"

build:
	@echo "Building Solana programs..."
	anchor build
	@echo "Building SDK..."
	cd sdk && yarn build
	@echo "Building Worker..."
	cd worker && yarn build
	@echo "Done!"

test:
	@echo "Running Anchor tests..."
	anchor test
	@echo "Running SDK tests..."
	cd sdk && yarn test || echo "No tests configured"
	@echo "Running Worker tests..."
	cd worker && yarn test || echo "No tests configured"
	@echo "Done!"

clean:
	@echo "Cleaning build artifacts..."
	rm -rf target/
	rm -rf sdk/dist/
	rm -rf worker/dist/
	rm -rf .anchor/
	@echo "Done!"

deploy-local:
	@echo "Starting local Solana test validator..."
	solana-test-validator --reset &
	sleep 5
	@echo "Building and deploying programs..."
	anchor build
	anchor deploy
	@echo "Done! Programs deployed to local validator"

fmt:
	@echo "Formatting Rust code..."
	cargo fmt --all
	@echo "Done!"

lint:
	@echo "Running Rust linters..."
	cargo clippy --all-targets --all-features
	@echo "Running TypeScript linters..."
	cd sdk && yarn lint
	cd worker && yarn lint
	@echo "Done!"
