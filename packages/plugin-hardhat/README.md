# OpenZeppelin Hardhat Upgrades

[![Docs](https://img.shields.io/badge/docs-%F0%9F%93%84-blue)](https://docs.openzeppelin.com/upgrades-plugins/hardhat-upgrades)
[![NPM Package](https://img.shields.io/npm/v/@openzeppelin/hardhat-upgrades.svg)](https://www.npmjs.org/package/@openzeppelin/hardhat-upgrades)

**Hardhat plugin for deploying and managing upgradeable contracts.** This package adds functions to your Hardhat scripts so you can deploy and upgrade proxies for your contracts. Depends on `ethers.js`.

> **⚠️ Migrating from Hardhat 2?** See the [Migration Guide](./MIGRATION.md) for breaking changes and how to update your code.

## Installation

```
npm install --save-dev @openzeppelin/hardhat-upgrades
npm install --save-dev @nomicfoundation/hardhat-ethers ethers # peer dependencies
```

And register the plugin in your [`hardhat.config.ts`](https://hardhat.org/config/):

```typescript
import { defineConfig } from 'hardhat/config';
import hardhatUpgrades from '@openzeppelin/hardhat-upgrades';

export default defineConfig({
  plugins: [hardhatUpgrades],
  // ... rest of config
});
```

## Usage in scripts

**Important:** Create a single network connection and share it across all operations. This ensures operations share the same context and state.

### Proxies

You can use this plugin in a [Hardhat script](https://hardhat.org/guides/scripts.html) to deploy an upgradeable instance of one of your contracts via the `deployProxy` function:

```js
// scripts/create-box.js
const hre = require("hardhat");
const { upgrades } = require("@openzeppelin/hardhat-upgrades");

async function main() {
  // Create connection once and reuse for all operations
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const { deployProxy, upgradeProxy } = await upgrades(hre, connection);
  
  const Box = await ethers.getContractFactory("Box");
  const box = await deployProxy(Box, [42]);
  await box.waitForDeployment();
  console.log("Box deployed to:", await box.getAddress());
  
  // Reuse the same connection for upgrades
  const BoxV2 = await ethers.getContractFactory("BoxV2");
  await upgradeProxy(await box.getAddress(), BoxV2);
}

main();
```

This will automatically check that the `Box` contract is upgrade-safe, deploy an implementation contract for the `Box` contract (unless there is one already from a previous deployment), create a proxy (along with a proxy admin if needed), and initialize it by calling `initialize(42)`.

Then, in another script, you can use the `upgradeProxy` function to upgrade the deployed instance to a new version. The new version can be a different contract (such as `BoxV2`), or you can just modify the existing `Box` contract and recompile it - the plugin will note it changed.

```js
// scripts/upgrade-box.js
const hre = require("hardhat");
const { upgrades } = require("@openzeppelin/hardhat-upgrades");

async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const { upgradeProxy } = await upgrades(hre, connection);
  
  const BoxV2 = await ethers.getContractFactory("BoxV2");
  await upgradeProxy(BOX_ADDRESS, BoxV2);
  console.log("Box upgraded");
}

main();
```

> Note: While this plugin keeps track of all the implementation contracts you have deployed per network, in order to reuse them and validate storage compatibilities, it does _not_ keep track of the proxies you have deployed. This means that you will need to manually keep track of each deployment address, to supply those to the upgrade function when needed.

The plugin will take care of comparing `BoxV2` to the previous one to ensure they are compatible for the upgrade, deploy the new `BoxV2` implementation contract (unless there is one already from a previous deployment), and upgrade the existing proxy to the new implementation.

### Beacon proxies

You can also use this plugin to deploy an upgradeable beacon for your contract with the `deployBeacon` function, then deploy one or more beacon proxies that point to it by using the `deployBeaconProxy` function.

```js
// scripts/create-box.js
const hre = require("hardhat");
const { upgrades } = require("@openzeppelin/hardhat-upgrades");

async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const { deployBeacon, deployBeaconProxy } = await upgrades(hre, connection);
  
  const Box = await ethers.getContractFactory("Box");

  const beacon = await deployBeacon(Box);
  await beacon.waitForDeployment();
  console.log("Beacon deployed to:", await beacon.getAddress());

  const box = await deployBeaconProxy(beacon, Box, [42]);
  await box.waitForDeployment();
  console.log("Box deployed to:", await box.getAddress());
}

main();
```

Then, in another script, you can use the `upgradeBeacon` function to upgrade the beacon to a new version. When the beacon is upgraded, all of the beacon proxies that point to it will use the new contract implementation.

```js
// scripts/upgrade-box.js
const hre = require("hardhat");
const { upgrades } = require("@openzeppelin/hardhat-upgrades");

async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const { upgradeBeacon } = await upgrades(hre, connection);
  
  const BoxV2 = await ethers.getContractFactory("BoxV2");
  await upgradeBeacon(BEACON_ADDRESS, BoxV2);
  console.log("Beacon upgraded");

  const box = BoxV2.attach(BOX_ADDRESS);
}

main();
```

## Usage in tests

You can also use the plugin's functions from your Hardhat tests, in case you want to add tests for upgrading your contracts (which you should!). The API is the same as in scripts.

**Important:** Share a single connection across all tests in a suite. Create the connection once in a `before` block or use top-level await (ESM) to ensure all operations share the same context.

### Proxies

```js
const { expect } = require("chai");
const hre = require("hardhat");
const { upgrades } = require("@openzeppelin/hardhat-upgrades");

describe("Box", function() {
  let upgradesApi;
  let ethers;
  
  before(async () => {
    const connection = await hre.network.connect();
    ({ ethers } = connection);
    upgradesApi = await upgrades(hre, connection);
  });

  it('works', async () => {
    const Box = await ethers.getContractFactory("Box");
    const BoxV2 = await ethers.getContractFactory("BoxV2");
  
    const instance = await upgradesApi.deployProxy(Box, [42]);
    const upgraded = await upgradesApi.upgradeProxy(await instance.getAddress(), BoxV2);

    const value = await upgraded.value();
    expect(value.toString()).to.equal('42');
  });
});
```

### Beacon proxies

```js
const { expect } = require("chai");
const hre = require("hardhat");
const { upgrades } = require("@openzeppelin/hardhat-upgrades");

describe("Box", function() {
  let upgradesApi;
  let ethers;
  
  before(async () => {
    const connection = await hre.network.connect();
    ({ ethers } = connection);
    upgradesApi = await upgrades(hre, connection);
  });

  it('works', async () => {
    const Box = await ethers.getContractFactory("Box");
    const BoxV2 = await ethers.getContractFactory("BoxV2");

    const beacon = await upgradesApi.deployBeacon(Box);
    const instance = await upgradesApi.deployBeaconProxy(beacon, Box, [42]);
    
    await upgradesApi.upgradeBeacon(beacon, BoxV2);
    const upgraded = BoxV2.attach(await instance.getAddress());

    const value = await upgraded.value();
    expect(value.toString()).to.equal('42');
  });
});
```

## TypeScript Support

Full TypeScript support is included. Import the factory functions with type safety:

```typescript
import { upgrades, defender } from '@openzeppelin/hardhat-upgrades';
import type { HardhatUpgrades, DefenderHardhatUpgrades } from '@openzeppelin/hardhat-upgrades';

task('deploy', async (args, hre) => {
  const connection = await hre.network.connect();
  const api: HardhatUpgrades = await upgrades(hre, connection);
  // ...
});
```

## Learn more
* Refer to the [API documentation](https://docs.openzeppelin.com/upgrades-plugins/api-hardhat-upgrades).
* Also see the [main documentation](https://docs.openzeppelin.com/upgrades-plugins) for more info.
