# Foundry — Development Toolkit for Ethereum

Foundry is a fast, portable, and modular toolkit for Ethereum application development written in Rust. It provides a complete local development workflow (testing, scripting, local node, CLI utilities) optimized for speed and automation.

Components:
- Forge — Ethereum testing framework and script runner (similar to Truffle / Hardhat / DappTools).
- Cast — Command-line Swiss army knife for interacting with EVM nodes and contracts.
- Anvil — Fast local Ethereum node (analogous to Ganache / Hardhat Network).
- Chisel — Interactive Solidity REPL for quick experimentation.

Documentation and official resources:
- Foundry Book: https://book.getfoundry.sh/

## Prerequisites
- Git
- Rust toolchain (optional for development of Foundry itself; foundryup will install binaries)
- Node.js and npm/yarn (for frontend)
- An Ethereum wallet or private key for deployments

## Quick setup (install Foundry)
```bash
# Install or update Foundry toolchain (forge, cast, anvil)
curl -L https://foundry.paradigm.xyz | bash
# Then restart the shell or source environment, then:
foundryup
```

## Common workflow
- Build contracts
```bash
forge build
```

- Run tests (unit and fuzz)
```bash
forge test
# Add -vv for verbose, or --gas-report for gas usage
forge test -vv --gas-report
```

- Format contracts
```bash
forge fmt
```

- Capture gas snapshots (for regression/CI)
```bash
forge snapshot
```

- Start a local node (Anvil)
```bash
anvil
# By default exposes local JSON-RPC at http://127.0.0.1:8545 and prints funded accounts & keys
```

- Use Cast to call node or interact with contracts
```bash
cast <subcommand> [args]
# Examples:
# cast send --from <address> --private-key <key> --to <to> --value <wei>
# cast call <contract> "balanceOf(address)(uint256)" <address> --rpc-url <url>
```

## Libraries / dependency management
Use forge to install common Solidity libraries into lib/:
```bash
# Example libraries used by this project
forge install https://github.com/jamesatomc/zama-lib.git
forge install https://github.com/OpenZeppelin/openzeppelin-contracts.git
```
These will be placed under the lib/ directory and referenced by imports in your contracts.

## Deployment examples
Notes:
- Use --broadcast to send transactions to the network (requires a signer: ledger, private key, or environment configured).
- Use --rpc-url / --fork-url for specifying network or fork.
- --ledger uses a hardware wallet when available.
- For scripts compiled with optimization settings, specify the appropriate compiler version/flags if necessary.

a) Deploy DEX — Alpen Labs Testnet
```bash
# Main deployment script (using a live RPC or fork)
forge script script/DeployDEX.s.sol --fork-url https://rpc.testnet.alpenlabs.io --ledger --broadcast

# Factory deployment (v2) with explicit entrypoint
forge script script/DeployDEX_v2.s.sol:DeployDEX_v2 --rpc-url https://rpc.testnet.alpenlabs.io --ledger --broadcast
```

b) Deploy DEX — Ethereum Sepolia
```bash
# Main contracts deployment using Sepolia RPC
forge script script/DeployDEX.s.sol --fork-url https://ethereum-sepolia-rpc.publicnode.com --ledger --broadcast

# Factory deployment (with optimizations)
forge script script/DeployDEX_v2.s.sol:DeployDEX_v2 --rpc-url https://ethereum-sepolia-rpc.publicnode.com --ledger --broadcast
```

## Verify contract on block explorer (example BlockScout)
- Example using forge verify-contract with a BlockScout-compatible explorer:
```bash
forge verify-contract \
  --rpc-url https://explorer.testnet.alpenlabs.io/api/eth-rpc \
  --verifier blockscout \
  --verifier-url 'https://explorer.testnet.alpenlabs.io/api/' \
  0x<ContractAddress> src/Kanari.sol:Kanari \
  --compiler-version 0.8.30
```
Adjust the verifier, verifier-url, contract path, and compiler version to match your deployment and explorer.

## Deploying a simple script (Counter example)
```bash
# Use a private key directly (avoid committing keys to repo)
forge script script/Counter.s.sol:CounterScript --rpc-url https://rpc.testnet.alpenlabs.io --private-key <your_private_key> --broadcast
```

## Frontend
```bash
cd frontend
npm install
npm run dev
# This typically starts a local dev server (e.g., Vite/Next) and serves the UI that interacts with deployed contracts.
```

## Tips and troubleshooting
- Use `forge inspect` to introspect compiled artifacts and contract metadata.
- Run `anvil` locally and use `forge test --fork-url http://127.0.0.1:8545` for deterministic debugging.
- For sensitive private keys, prefer environment variables or secure vaults. Never commit keys to source control.
- If verification fails, confirm contract metadata (compiler version, optimization settings, ABI/metadata) match those used during deployment.

## CI and automation
- Many projects run `forge test --gas-report` and `forge snapshot` in CI.
- Use ephemeral Anvil instances in CI to run fast, isolated tests.

## Further reading
- Foundry Book: https://book.getfoundry.sh/
- Forge CLI reference: https://book.getfoundry.sh/reference/forge/
- Cast documentation: https://book.getfoundry.sh/reference/cast/

## License and contribution
- This repository follows the license specified in LICENSE (if present). Please open issues or PRs for improvements and fixes.
