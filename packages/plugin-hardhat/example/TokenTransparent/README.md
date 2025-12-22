# Upgrade Workflow Example: Ownable → AccessControl (Transparent Proxy)

This example demonstrates how to upgrade an upgradeable contract from using `Ownable` to `AccessControl` using the **Transparent proxy pattern** with the OpenZeppelin Hardhat Upgrades plugin and Hardhat 3.

## Overview

This example shows:
- ✅ Deploying an upgradeable ERC20 token with `Ownable` (V1)
- ✅ Upgrading to a new version using `AccessControl` (V2)
- ✅ Migrating state from one access control pattern to another
- ✅ Using Hardhat 3's connection-based API
- ✅ Preserving contract state during upgrades
- ✅ Testing upgrade workflows

## Prerequisites

- Node.js 18+ and npm/yarn
- Access to the OpenZeppelin Upgrades repository (for workspace dependency)
- Basic understanding of upgradeable contracts and proxy patterns

## Project Structure

```
TokenTransparent/
├── contracts/
│   ├── TokenV1.sol      # Initial version with Ownable
│   └── TokenV2.sol      # Upgraded version with AccessControl
├── scripts/
│   ├── 1-deploy.ts      # Deploy V1 contract
│   ├── 2-upgrade.ts     # Upgrade to V2
│   └── 3-verify-upgrade.ts  # Verify upgrade success
├── test/
│   ├── upgrade.test.ts  # TypeScript integration tests (AVA)
│   └── TokenTransparent.t.sol  # Solidity tests (Hardhat 3)
├── hardhat.config.ts    # Hardhat 3 configuration
├── package.json
└── README.md
```

## Installation

1. Install dependencies:
```bash
cd packages/plugin-hardhat/example
yarn install
```

2. Compile contracts:
```bash
yarn compile
```

## Usage

### Step 1: Deploy V1 Contract

Deploy the initial version of the token with `Ownable`:

```bash
yarn deploy
```

This will:
- Deploy a Transparent proxy
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
2. Run the upgrade script:

```bash
yarn upgrade
```

This will:
- Validate the upgrade compatibility
- Deploy the new V2 implementation
- Upgrade the proxy
- Call `migrateFromV1()` to migrate ownership to AccessControl roles
- Verify the migration was successful

**Example output:**
```
Previous owner: 0x...
✅ Upgrade validation passed
⬆️  Upgrading proxy to TokenV2...
✅ Upgrade successful!
Previous owner has DEFAULT_ADMIN_ROLE: true
Previous owner has MINTER_ROLE: true
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
- Confirm ERC20Permit is available

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

The TypeScript tests are in `test/upgrade.test.ts` and the Solidity tests are in `test/TokenTransparent.t.sol`. Both use the same test scenarios to ensure consistency across frameworks.

## Understanding the Upgrade Pattern

### Storage Layout Compatibility

Both `OwnableUpgradeable` and `AccessControlUpgradeable` in OpenZeppelin Contracts v5.0+ use **ERC-7201 namespaced storage**, which means they use different storage namespaces and don't conflict. This allows us to safely migrate from one to the other.

### Migration Strategy

The upgrade uses a **migration function** (`migrateFromV1`) because:

1. **Initialization Parameter Mismatch**: V1's `initialize(address initialOwner)` has a different signature than V2's `initialize(address initialAdmin)`. We can't use the standard `initializer` modifier.

2. **Reinitializer Pattern**: We use `reinitializer(2)` because:
   - The contract was initialized once in V1 (using `initializer`)
   - This is the second initialization (hence `reinitializer(2)`)
   - We only initialize `AccessControl` here, not `ERC20` or `Permit` (already initialized)

3. **Call Option**: The `call` option in `upgradeProxy` allows us to execute `migrateFromV1()` atomically during the upgrade, ensuring the migration happens in the same transaction.

### Code Flow

```
V1 Deployment:
  └─> initialize(owner)
      └─> __ERC20_init()
      └─> __Ownable_init(owner)
      └─> __ERC20Permit_init()

Upgrade to V2:
  └─> Deploy V2 implementation
  └─> Upgrade proxy to point to V2
  └─> Call migrateFromV1(previousOwner)
      └─> __AccessControl_init() [reinitializer(2)]
      └─> _grantRole(DEFAULT_ADMIN_ROLE, previousOwner)
      └─> _grantRole(MINTER_ROLE, previousOwner)
```

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

## Storage Layout Analysis

### OwnableUpgradeable (V1)
- Uses ERC-7201 namespace: `keccak256("Ownable.Ownable")`
- Stores: `_owner` address

### AccessControlUpgradeable (V2)
- Uses ERC-7201 namespace: `keccak256("AccessControl.AccessControl")`
- Stores: Role mappings and admin roles

Since they use different namespaces, there's no storage conflict!

## Troubleshooting

### "Please set PROXY_ADDRESS"
Make sure you've updated the `PROXY_ADDRESS` constant in the upgrade/verify scripts with the address from the deployment.

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

- Explore other upgrade patterns (UUPS, Beacon)
- Learn about [storage gaps](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps) for future extensibility
- Read the [full plugin documentation](https://docs.openzeppelin.com/upgrades-plugins)
- Check out the [OpenZeppelin Contracts documentation](https://docs.openzeppelin.com/contracts)

## Resources

- [Hardhat 3 Migration Guide](../MIGRATION.md)
- [OpenZeppelin Upgrades Plugin Docs](https://docs.openzeppelin.com/upgrades-plugins)
- [ERC-7201: Namespaced Storage Layout](https://eips.ethereum.org/EIPS/eip-7201)
- [Proxy Patterns](https://docs.openzeppelin.com/contracts/api/proxy)

## License

MIT

