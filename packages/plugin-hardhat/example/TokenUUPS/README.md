# Upgrade Workflow Example: Ownable → AccessControl (UUPS Proxy)

This example demonstrates how to upgrade an upgradeable contract from using `Ownable` to `AccessControl` using the **UUPS proxy pattern** with the OpenZeppelin Hardhat Upgrades plugin and Hardhat 3.

## Overview

This example shows:
- ✅ Deploying an upgradeable ERC20 token with `Ownable` and UUPS (V1)
- ✅ Upgrading to a new version using `AccessControl` and UUPS (V2)
- ✅ Migrating state from one access control pattern to another
- ✅ Using Hardhat 3's connection-based API
- ✅ Preserving contract state during upgrades
- ✅ Contract-controlled upgrade authorization (no ProxyAdmin)

## Key Features of UUPS

- **No ProxyAdmin**: Unlike Transparent proxies, UUPS doesn't require a separate ProxyAdmin contract
- **Gas Efficient**: Upgrades are more gas-efficient than Transparent proxies
- **Contract-Controlled**: Upgrade authorization is handled by the implementation contract via `_authorizeUpgrade`
- **Owner-Based Upgrades (V1)**: In V1, only the owner can authorize upgrades
- **Role-Based Upgrades (V2)**: In V2, only addresses with `UPGRADER_ROLE` can authorize upgrades

## Prerequisites

- Node.js 18+ and npm/yarn
- Access to the OpenZeppelin Upgrades repository (for workspace dependency)
- Basic understanding of upgradeable contracts and proxy patterns

## Project Structure

```
TokenUUPS/
├── contracts/
│   ├── TokenV1.sol      # Initial version with Ownable + UUPS
│   └── TokenV2.sol     # Upgraded version with AccessControl + UUPS
├── scripts/
│   ├── 1-deploy.ts      # Deploy V1 contract
│   ├── 2-upgrade.ts     # Upgrade to V2
│   └── 3-verify-upgrade.ts  # Verify upgrade success
├── test/
│   ├── upgrade.test.ts  # TypeScript integration tests (AVA)
│   └── TokenUUPS.t.sol  # Solidity tests (Hardhat 3)
├── hardhat.config.ts    # Hardhat 3 configuration
├── package.json
└── README.md
```

## Installation

1. Install dependencies (from workspace root):
```bash
yarn install
```

2. Compile contracts:
```bash
cd packages/plugin-hardhat/example/TokenUUPS
yarn compile
```

## Usage

### Step 1: Deploy V1 Contract

Deploy the initial version of the token with `Ownable` and UUPS:

```bash
yarn deploy
```

This will:
- Deploy a UUPS proxy (no ProxyAdmin)
- Initialize the contract with the deployer as owner
- Output the proxy address (save this for the next step!)

**Example output:**
```
Deploying with account: 0x...
Proxy address: 0x1234...
💡 Save this address for the upgrade script!
```

### Step 2: Upgrade to V2

1. Open `scripts/2-upgrade.ts` and set `PROXY_ADDRESS` to the address from Step 1
2. **Important**: Use the same account that was the owner in V1 (it needs to authorize the upgrade)
3. Run the upgrade script:

```bash
yarn upgrade
```

This will:
- Validate the upgrade compatibility
- Deploy the new V2 implementation
- Upgrade the proxy (authorized by owner via `_authorizeUpgrade`)
- Call `migrateFromV1()` to migrate ownership to AccessControl roles
- Verify the migration was successful

**Example output:**
```
Previous owner: 0x...
✅ Deployer is the owner and can authorize upgrade
✅ Upgrade validation passed
⬆️  Upgrading UUPS proxy to TokenV2...
✅ Upgrade successful!
Previous owner has DEFAULT_ADMIN_ROLE: true
Previous owner has MINTER_ROLE: true
Previous owner has UPGRADER_ROLE: true
✅ Migration completed successfully!
```

### Step 3: Verify Upgrade

1. Open `scripts/3-verify-upgrade.ts` and set `PROXY_ADDRESS`
2. Run the verification script:

```bash
yarn verify
```

This will:
- Check access control roles
- Verify token metadata
- Test minting functionality
- Verify ERC20Permit is available
- Verify UUPS upgrade authorization

## Running Tests

This example includes both TypeScript and Solidity tests. Run all tests with:

```bash
yarn test
```

This command will:
1. Compile the contracts
2. Run the TypeScript test suite (using AVA)
3. Run the Solidity test suite (using Hardhat 3's built-in Solidity testing)

### Test Coverage

Both test suites cover the same scenarios:
- ✅ Deployment and upgrade workflow
- ✅ State preservation
- ✅ Access control migration
- ✅ Role-based permissions
- ✅ Token functionality
- ✅ UUPS upgrade authorization

The TypeScript tests are in `test/upgrade.test.ts` and the Solidity tests are in `test/TokenUUPS.t.sol`. Both use the same test scenarios to ensure consistency across frameworks.

## Understanding the Upgrade Pattern

### Storage Layout Compatibility ✅

Both `OwnableUpgradeable` and `AccessControlUpgradeable` in OpenZeppelin Contracts v5.0+ use **ERC-7201 namespaced storage**, which means they use different storage namespaces and don't conflict. This allows us to safely migrate from one to the other.

### Migration Strategy

The upgrade uses a **migration function** (`migrateFromV1`) because:

1. **Initialization Parameter Mismatch**: V1's `initialize(address initialOwner)` has a different signature than V2's `initialize(address defaultAdmin, address minter, address upgrader)`. We can't use the standard `initializer` modifier.

2. **Reinitializer Pattern**: We use `reinitializer(2)` because:
   - The contract was initialized once in V1 (using `initializer`)
   - This is the second initialization (hence `reinitializer(2)`)
   - We only initialize `AccessControl` here, not `ERC20`, `Permit`, or `UUPS` (already initialized)

3. **Call Option**: The `call` option in `upgradeProxy` allows us to execute `migrateFromV1()` atomically during the upgrade, ensuring the migration happens in the same transaction.

### Upgrade Authorization

**V1 (Ownable):**
```solidity
function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
```

**V2 (AccessControl):**
```solidity
function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
```

The upgrade from V1 to V2 is authorized by the owner (via `onlyOwner`), and after the upgrade, future upgrades require `UPGRADER_ROLE`.

## Hardhat 3 API Patterns

This example demonstrates the new Hardhat 3 connection-based API:

### Connection Pattern
```typescript
// Get network connection (required in Hardhat 3)
const connection = await hre.network.connect();
const { ethers } = connection;

// Get upgrades API
const upgradesApi = await upgrades(hre, connection);
```

### Key Differences from Hardhat 2

| Hardhat 2 | Hardhat 3 |
|-----------|-----------|
| `hre.ethers` | `connection.ethers` |
| `hre.upgrades.deployProxy()` | `upgradesApi.deployProxy()` |
| Automatic API | Factory function `upgrades(hre, connection)` |

**Important**: Always share the connection across multiple operations. Don't create a new connection for each operation.

## Differences: UUPS vs Transparent

| Feature | UUPS | Transparent |
|---------|------|-------------|
| ProxyAdmin | ❌ No | ✅ Yes |
| Upgrade Authorization | Contract (`_authorizeUpgrade`) | ProxyAdmin |
| Gas Cost (Upgrade) | Lower | Higher |
| Complexity | Higher | Lower |
| Initial Setup | Owner authorizes | ProxyAdmin authorizes |
| After Upgrade | UPGRADER_ROLE authorizes | ProxyAdmin still authorizes |

## Troubleshooting

### "Please set PROXY_ADDRESS"
Make sure you've updated the `PROXY_ADDRESS` constant in the upgrade/verify scripts with the address from the deployment.

### "Deployer account is not the owner"
Make sure you're using the same account that was used as the owner during V1 deployment. The owner needs to authorize the upgrade in UUPS.

### "Upgrade validation failed"
This usually means there's a storage layout incompatibility. Check:
- Both contracts use compatible storage layouts
- No storage variables were removed or reordered
- All parent contracts are upgrade-safe

### "Migration may not have completed correctly"
Verify that:
- The `call` option was used correctly
- The `migrateFromV1` function executed successfully
- The previous owner address was correct

### Plugin not found
If you get errors about `@openzeppelin/hardhat-upgrades` not being found:
1. Make sure you're in the workspace root
2. Run `yarn install` from the root
3. The example uses `workspace:*` to reference the local plugin

## Next Steps

- Compare with [TokenTransparent](../TokenTransparent/README.md) example
- Explore [TokenExample](../TokenExample/README.md) for UUPS with AccessControl from start
- Learn about [storage gaps](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps) for future extensibility
- Read the [full plugin documentation](https://docs.openzeppelin.com/upgrades-plugins)
- Check out the [OpenZeppelin Contracts documentation](https://docs.openzeppelin.com/contracts)

## Resources

- [Hardhat 3 Migration Guide](../../MIGRATION.md)
- [OpenZeppelin Upgrades Plugin Docs](https://docs.openzeppelin.com/upgrades-plugins)
- [UUPS Proxies](https://docs.openzeppelin.com/contracts/api/proxy#UUPSUpgradeable)
- [ERC-7201: Namespaced Storage Layout](https://eips.ethereum.org/EIPS/eip-7201)
- [Proxy Patterns](https://docs.openzeppelin.com/contracts/api/proxy)

## License

MIT


