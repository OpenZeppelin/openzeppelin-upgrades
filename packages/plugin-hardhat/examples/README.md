# Examples

Two self-contained example projects demonstrating the OpenZeppelin Hardhat Upgrades plugin with Hardhat 3.

Both use a simple `Box` contract (stores a value, V2 adds `increment`) to demonstrate how to deploy and upgrade a proxy using the plugin.

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

## Resources

- [OpenZeppelin Hardhat Upgrades readme](../README.md)
- [Hardhat 3 migration guide](../MIGRATION.md)
