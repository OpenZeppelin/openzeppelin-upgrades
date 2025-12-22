# Upgrade Workflow Examples

This directory contains example projects demonstrating different upgrade patterns and workflows using the OpenZeppelin Hardhat Upgrades plugin with Hardhat 3.

## Available Examples

### TokenTransparent

Demonstrates upgrading from `Ownable` to `AccessControl` using the **Transparent proxy pattern**.

**Features:**
- ✅ Deploying an upgradeable ERC20 token with `Ownable` (V1)
- ✅ Upgrading to a new version using `AccessControl` (V2)
- ✅ Migrating state from one access control pattern to another
- ✅ Using Hardhat 3's connection-based API
- ✅ Preserving contract state during upgrades

See [TokenTransparent/README.md](./TokenTransparent/README.md) for detailed instructions.

### TokenUUPS

Demonstrates upgrading from `Ownable` to `AccessControl` using the **UUPS proxy pattern**.

**Features:**
- ✅ Deploying an upgradeable ERC20 token with `Ownable` and UUPS (V1)
- ✅ Upgrading to a new version using `AccessControl` and UUPS (V2)
- ✅ Migrating state from one access control pattern to another
- ✅ Contract-controlled upgrade authorization (no ProxyAdmin)
- ✅ Using Hardhat 3's connection-based API
- ✅ More gas-efficient upgrades compared to Transparent

See [TokenUUPS/README.md](./TokenUUPS/README.md) for detailed instructions.

### TokenExample

Demonstrates the **UUPS proxy pattern** with AccessControl from the start.

**Features:**
- ✅ Deploying an upgradeable ERC20 token with AccessControl and UUPS
- ✅ Upgrading to a new version with additional functionality (burn)
- ✅ Role-based access control (Admin, Minter, Upgrader)
- ✅ Contract-controlled upgrade authorization
- ✅ Using Hardhat 3's connection-based API

See [TokenExample/README.md](./TokenExample/README.md) for detailed instructions.

## Future Examples

Additional examples may be added for:
- **TokenBeacon** - Beacon proxy pattern examples
- **Other patterns** - Additional upgrade scenarios

## Getting Started

1. Navigate to the example you want to use:
   ```bash
   cd TokenTransparent
   ```

2. Install dependencies (from workspace root):
   ```bash
   yarn install
   ```

3. Follow the example-specific README for detailed instructions.

## Requirements

- Node.js 18+ and npm/yarn
- Access to the OpenZeppelin Upgrades repository (for workspace dependency)
- Basic understanding of upgradeable contracts and proxy patterns

## Resources

- [Hardhat 3 Migration Guide](../MIGRATION.md)
- [OpenZeppelin Upgrades Plugin Docs](https://docs.openzeppelin.com/upgrades-plugins)
- [Proxy Patterns](https://docs.openzeppelin.com/contracts/api/proxy)
