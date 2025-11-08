# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- TypeScript SDK with full Anchor support
- Worker client for GPU node operators
- IDL files for TypeScript compilation
- Comprehensive gitignore patterns
- Environment variables example file
- Development scripts for build and testing

### Fixed
- SDK TypeScript compilation errors
- Worker TypeScript compilation errors
- Program initialization parameters
- Account access type casting
- Provider initialization issues

### Changed
- Updated SDK to use temporary IDL files
- Enhanced Worker configuration interface
- Improved type safety across all clients

## [1.0.0] - 2025-01-05

### Added
- Initial release with 5 Solana programs
- Markets Program for job/node matching
- Staking Program with time-locked rewards
- Rewards Program with O(1) distribution
- Slashing Program for fraud detection
- Governance Program for DAO voting
- Complete SDK for Solana interactions
- Worker client for GPU nodes
- CLI for deployments
- Comprehensive documentation

### Security
- Fixed 6 critical/high vulnerabilities
- 35-40% gas optimization across programs
- Input validation improvements
- Reentrancy protection

[Unreleased]: https://github.com/Hypernode-sol/hypernode-llm-deployer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Hypernode-sol/hypernode-llm-deployer/releases/tag/v1.0.0
