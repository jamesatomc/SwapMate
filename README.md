## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy DeployDEX

```shell
$ forge script script/DeployDEX.s.sol --fork-url https://rpc.testnet.alpenlabs.io --ledger --broadcast
```

### verify-contract-address
```shell
$ forge verify-contract --rpc-url https://explorer.testnet.alpenlabs.io/api/eth-rpc --verifier blockscout --verifier-url 'https://explorer.testnet.alpenlabs.io/api/' 0x1d1D334E3fe1c22B12D68af6B4Ffd8DFd4c1a5e7 src/Kanari.sol:Kanari --compiler-version 0.8.30
```

### Deploy Counter (Original)

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url https://rpc.testnet.alpenlabs.io --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
ระบบ farm คู่ kanari/coin(เหรียญหลัก) จะได้ Reward Rate หารจำนวนผู้นวาง lp หากมีเยอะก็จะหารเยอะ ใช้เวลา 6 ปี ถึงจะจบ pool Reward max 6m kanari ปีหนึงตก ปีละ 1m kanari จนครบ 6 ปี ปรับ DeployDEX_v2.s.sol