# OpenZeppelin Buidler Upgrades

[![Docs](https://img.shields.io/badge/docs-%F0%9F%93%84-blue)](https://docs.openzeppelin.com/upgrades-plugins/buidler-upgrades)
[![NPM Package](https://img.shields.io/npm/v/@openzeppelin/buidler-upgrades.svg)](https://www.npmjs.org/package/@openzeppelin/buidler-upgrades)

**Buidler plugin for deploying and managing upgradeable contracts.** This package adds functions to your Buidler scripts so you can deploy and upgrade proxies for your contracts. Depends on `ethers.js`.

## Installation

```
npm install --save-dev @openzeppelin/buidler-upgrades
npm install --save-dev @nomiclabs/buidler-ethers ethers # peer dependencies
```

And register the plugins in your [`buidler.config.js`](https://buidler.dev/config/):

```js
usePlugin('@nomiclabs/buidler-ethers');
usePlugin('@openzeppelin/buidler-upgrades');
```

## Usage in scripts

You can use this plugin in a [Buidler script](https://buidler.dev/guides/scripts.html) to deploy an upgradeable instance of one of your contracts via the `deployProxy` function:

```js
// scripts/create-box.js
const { ethers, upgrades } = require("@nomiclabs/buidler");

async function main() {
  const Box = await ethers.getContractFactory("Box");
  const box = await upgrades.deployProxy(Box, [42]);
  await box.deployed();
  console.log("Box deployed to:", box.address);
}

main();
```

This will automatically check that the `Box` contract is upgrade-safe, set up a proxy admin (if needed), deploy an implementation contract for the `Box` contract (unless there is one already from a previous deployment), create a proxy, and initialize it by calling `initialize(42)`.

Then, in another script, you can use the `upgradeProxy` function to upgrade the deployed instance to a new version. The new version can be a different contract (such as `BoxV2`), or you can just modify the existing `Box` contract and recompile it - the plugin will note it changed.

```js
// scripts/upgrade-box.js
const { ethers, upgrades } = require("@nomiclabs/buidler");

async function main() {
  const BoxV2 = await ethers.getContractFactory("BoxV2");
  const box = await upgrades.upgradeProxy(BOX_ADDRESS, BoxV2);
  await box.deployed();
  console.log("Box upgraded");
}

main();
```

> Note: While this plugin keeps track of all the implementation contracts you have deployed per network, in order to reuse them and validate storage compatibilities, it does _not_ keep track of the proxies you have deployed. This means that you will need to manually keep track of each deployment address, to supply those to the upgrade function when needed.

The plugin will take care of comparing `BoxV2` to the previous one to ensure they are compatible for the upgrade, deploy the new `BoxV2` implementation contract (unless there is one already from a previous deployment), and upgrade the existing proxy to the new implementation.

## Usage in tests

You can also use the `deployProxy` and `upgradeProxy` functions from your Buidler tests, in case you want to add tests for upgrading your contracts (which you should!). The API is the same as in scripts.

```js
const { expect } = require("chai");

describe("Box", function() {
  it('works', async () => {
    const Box = await ethers.getContractFactory("Box");
    const BoxV2 = await ethers.getContractFactory("BoxV2");
  
    const instance = await upgrades.deployProxy(Box, [42]);
    const upgraded = await upgrades.upgradeProxy(instance.address, BoxV2);

    const value = await upgraded.value();
    expect(value.toString()).to.equal('42');
  });
});
```

## Learn more
* Refer to the [API documentation](https://docs.openzeppelin.com/upgrades-plugins/api-buidler-upgrades).
* Also see the [main documentation](https://docs.openzeppelin.com/upgrades-plugins) for more info.
