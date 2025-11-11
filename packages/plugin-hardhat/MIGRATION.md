# Migration Guide: Hardhat 2 to Hardhat 3

> **Prerequisite:** Migrate your Hardhat project to Hardhat 3 first. See the [official Hardhat 3 migration guide](https://hardhat.org/docs/migrate-from-hardhat2).

## Breaking Changes

1. **No automatic `hre.upgrades`** - Must call factory function explicitly
2. **Factory functions are async** - Require `await` and network connection
3. **Import changes** - Import factory functions, not just the plugin

## Migration

### Update Config

In Hardhat 3, plugins must be explicitly added to the `plugins` array in your config:

**Before (Hardhat 2):**
```typescript
import '@openzeppelin/hardhat-upgrades';
```

**After (Hardhat 3):**
```typescript
import { defineConfig } from 'hardhat/config';
import hardhatUpgrades from '@openzeppelin/hardhat-upgrades';

export default defineConfig({
  plugins: [hardhatUpgrades],
  // ... rest of config
});
```

### Update Imports

**Before:**
```typescript
import '@openzeppelin/hardhat-upgrades';
```

**After:**
```typescript
import { upgrades, defender } from '@openzeppelin/hardhat-upgrades';
```

All functions are now exported by the API. Import `upgrades` for standard functions, or `defender` for Defender-specific functions.

### Update Usage

**Before:**
```typescript
await hre.upgrades.deployProxy(MyContract, []);
```

**After:**
```typescript
const connection = await hre.network.connect();
const { deployProxy } = await upgrades(hre, connection);
await deployProxy(MyContract, []);
```

**Important:** 
- Both `upgrades` and `defender` receive `hre` and `connection` as parameters: `upgrades(hre, connection)` or `defender(hre, connection)`
- Share the connection across multiple operations do not create a new one each time
- In tests, create the connection once in a `before` block or use top-level await (ESM)

## Examples

### Scripts

```typescript
import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades';

async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const { deployProxy, upgradeProxy } = await upgrades(hre, connection);
  
  const MyContract = await ethers.getContractFactory('MyContract');
  const proxy = await deployProxy(MyContract, []);
  
  const MyContractV2 = await ethers.getContractFactory('MyContractV2');
  await upgradeProxy(proxy, MyContractV2);
}

main();
```

### Tasks

```typescript
import { task } from 'hardhat/config';
import { upgrades } from '@openzeppelin/hardhat-upgrades';

task('deploy', async (args, hre) => {
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const { deployProxy } = await upgrades(hre, connection);
  const MyContract = await ethers.getContractFactory('MyContract');
  await deployProxy(MyContract, []);
});
```

### Tests

**Important:** In Hardhat 3, `ethers` comes from the connection, not `hre.ethers`. Share the connection across all tests in a suite.

**Before (Hardhat 2):**
```typescript
import hre from 'hardhat';
import '@openzeppelin/hardhat-upgrades';

describe('MyContract', () => {
  it('should deploy', async () => {
    const MyContract = await hre.ethers.getContractFactory('MyContract');
    const proxy = await hre.upgrades.deployProxy(MyContract, []);
  });
});
```

**After (Hardhat 3) - with `before` hook:**
```typescript
import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades';

describe('MyContract', () => {
  let upgradesApi;
  let ethers;
  
  before(async () => {
    const connection = await hre.network.connect();
    ({ ethers } = connection);
    upgradesApi = await upgrades(hre, connection);
  });

  it('should deploy', async () => {
    const MyContract = await ethers.getContractFactory('MyContract');
    const proxy = await upgradesApi.deployProxy(MyContract, []);
  });
});
```

**After (Hardhat 3) - with ESM top-level await:**
```typescript
import hre from 'hardhat';
import { upgrades, defender } from '@openzeppelin/hardhat-upgrades';

const connection = await hre.network.connect();
const { ethers } = connection;
const upgradesApi = await upgrades(hre, connection);
const defenderApi = await defender(hre, connection);

describe('MyContract', () => {
  it('should deploy', async () => {
    const MyContract = await ethers.getContractFactory('MyContract');
    const proxy = await upgradesApi.deployProxy(MyContract, []);
  });
});
```

Note: Both `upgrades` and `defender` receive `hre` and `connection` as parameters.

## Checklist

- Add plugin to `plugins` array in `hardhat.config.ts`: `plugins: [hardhatUpgrades]`
- Replace `import '@openzeppelin/hardhat-upgrades'` → `import { upgrades, defender } from '@openzeppelin/hardhat-upgrades'` in scripts/tests
- Add `const connection = await hre.network.connect();` (share connection across operations, don't create new ones)
- Replace `hre.ethers` → `ethers` from connection (`const { ethers } = connection`)
- Replace `hre.upgrades.method()` → destructure from `await upgrades(hre, connection)`
- Replace `hre.defender.method()` → destructure from `await defender(hre, connection)`
- Update all scripts, tasks, and tests
