# Examples

Self-contained example projects demonstrating the OpenZeppelin Hardhat Upgrades plugin with Hardhat 3.

All use a simple `Box` contract (stores a value, V2 adds `increment`).

## BoxTransparent

Transparent proxy pattern. The ProxyAdmin contract controls upgrades.

```bash
cd BoxTransparent
npm install
npm test
```

## BoxUUPS

UUPS proxy pattern. The implementation contract controls upgrades via `_authorizeUpgrade`.

```bash
cd BoxUUPS
npm install
npm test
```

## BoxViem

Transparent proxy pattern using the viem-based API (`@openzeppelin/hardhat-upgrades/viem`) with `@nomicfoundation/hardhat-viem`. Contracts are identified by name and the returned contract instances are viem contract instances.

```bash
cd BoxViem
npm install
npm test
```

## BoxSolidityTests

Solidity test example using `hardhat test solidity` with `@openzeppelin/foundry-upgrades` (FFI enabled).

```bash
cd BoxSolidityTests
npm install
npm test
```

## Resources

- [OpenZeppelin Hardhat Upgrades readme](../README.md)
- [Hardhat 3 migration guide](../MIGRATION.md)
