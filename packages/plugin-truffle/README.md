# OpenZeppelin Truffle Upgrades

> **Warning**
> This package is deprecated. The recommended alternative is to use [Hardhat](https://hardhat.org/) along with the [Hardhat Upgrades](https://docs.openzeppelin.com/upgrades-plugins/hardhat-upgrades) plugin.

[![Docs](https://img.shields.io/badge/docs-%F0%9F%93%84-blue)](https://docs.openzeppelin.com/upgrades-plugins/truffle-upgrades)
[![NPM Package](https://img.shields.io/npm/v/@openzeppelin/truffle-upgrades.svg)](https://www.npmjs.org/package/@openzeppelin/truffle-upgrades)

**Truffle package for deploying and managing upgradeable contracts.** This package adds functions to your Truffle migrations and tests so you can deploy and upgrade proxies for your contracts.

> Note: Usage from [Truffle external scripts](https://www.trufflesuite.com/docs/truffle/getting-started/writing-external-scripts) is not yet supported.

## Installation

```
npm install --save-dev @openzeppelin/truffle-upgrades
```

This package requires Truffle [version 5.1.35](https://github.com/trufflesuite/truffle/releases/tag/v5.1.35) or greater.

## Usage in migrations

### Proxies

To deploy an upgradeable instance of one of your contracts in your migrations, use the `deployProxy` function:

```js
// migrations/NN_deploy_upgradeable_box.js
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const Box = artifacts.require('Box');

module.exports = async function (deployer) {
  const instance = await deployProxy(Box, [42], { deployer });
  console.log('Deployed', instance.address);
};
```

This will automatically check that the `Box` contract is upgrade-safe, set up a proxy admin (if needed), deploy an implementation contract for the `Box` contract (unless there is one already from a previous deployment), create a proxy, and initialize it by calling `initialize(42)`.

Then, in a future migration, you can use the `upgradeProxy` function to upgrade the deployed instance to a new version. The new version can be a different contract (such as `BoxV2`), or you can just modify the existing `Box` contract and recompile it - the plugin will note it changed.

```js
// migrations/MM_upgrade_box_contract.js
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Box = artifacts.require('Box');
const BoxV2 = artifacts.require('BoxV2');

module.exports = async function (deployer) {
  const existing = await Box.deployed();
  const instance = await upgradeProxy(existing.address, BoxV2, { deployer });
  console.log("Upgraded", instance.address);
};
```

The plugin will take care of comparing `BoxV2` to the previous one to ensure they are compatible for the upgrade, deploy the new `BoxV2` implementation contract (unless there is one already from a previous deployment), and upgrade the existing proxy to the new implementation.

### Beacon proxies

You can also use this plugin to deploy an upgradable beacon for your contract with the `deployBeacon` function, then deploy one or more beacon proxies that point to it by using the `deployBeaconProxy` function.

```js
// migrations/NN_deploy_upgradeable_box.js
const { deployBeacon, deployBeaconProxy } = require('@openzeppelin/truffle-upgrades');

const Box = artifacts.require('Box');

module.exports = async function (deployer) {
  const beacon = await deployBeacon(Box);
  console.log('Beacon deployed', beacon.address);

  const instance = await deployBeaconProxy(beacon, Box, [42], { deployer });
  console.log('Box deployed', instance.address);
};
```

In a future migration, you can use the `erc1967.getBeaconAddress` function to get the beacon address from a deployed beacon proxy instance, then call the `upgradeBeacon` function to upgrade that beacon to a new version. When the beacon is upgraded, all of the beacon proxies that point to it will use the new contract implementation.

```js
// migrations/MM_upgrade_box_contract.js
const { erc1967, upgradeBeacon } = require('@openzeppelin/truffle-upgrades');

const Box = artifacts.require('Box');
const BoxV2 = artifacts.require('BoxV2');

module.exports = async function (deployer) {
  const existing = await Box.deployed();

  const beaconAddress = await erc1967.getBeaconAddress(existing.address);
  await upgradeBeacon(beaconAddress, BoxV2, { deployer });
  console.log("Beacon upgraded", beaconAddress);

  const instance = await BoxV2.at(existing.address);
};
```

## Usage in tests

You can also use the plugin's functions from your Truffle tests, in case you want to add tests for upgrading your contracts (which you should!). The API is the same as in the migrations, only that without a `deployer` parameter.

### Proxies

```js
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Box = artifacts.require('Box');
const BoxV2 = artifacts.require('BoxV2');

describe('upgrades', () => {
  it('works', async () => {
    const box = await deployProxy(Box, [42]);
    const box2 = await upgradeProxy(box.address, BoxV2);

    const value = await box2.value();
    assert.equal(value.toString(), '42');
  });
});
```

### Beacon proxies

```js
const { deployBeacon, deployBeaconProxy, upgradeBeacon } = require('@openzeppelin/truffle-upgrades');

const Box = artifacts.require('Box');
const BoxV2 = artifacts.require('BoxV2');

describe('upgrades', () => {
  it('works', async () => {
    const beacon = await deployBeacon(Box);
    const box = await deployBeaconProxy(beacon, Box, [42]);

    await upgradeBeacon(beacon, BoxV2);
    const box2 = await BoxV2.at(box.address);

    const value = await box2.value();
    assert.equal(value.toString(), '42');
  });
});
```

## Learn more
* Refer to the [API documentation](https://docs.openzeppelin.com/upgrades-plugins/api-truffle-upgrades).
* Also see the [main documentation](https://docs.openzeppelin.com/upgrades-plugins) for more info.
