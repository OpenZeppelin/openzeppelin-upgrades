# OpenZeppelin Buidler Upgrades

**Buidler plugin for deploying and managing upgradeable contracts.** This package adds functions to your Buidler scripts so you can deploy and upgrade proxies for your contracts. Depends on `ethers.js`.

## Installation

```
npm install --save-dev @nomiclabs/buidler-ethers @openzeppelin/buidler-upgrades
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

## API

Both `deployProxy` and `upgradeProxy` functions will return instances of [ethers.js contracts](https://docs.ethers.io/v5/api/contract/contract/), and require [ethers.js contract factories](https://docs.ethers.io/v5/api/contract/contract-factory/) as arguments. All functions validate that the implementation contract is upgrade-safe, and will fail otherwise.

### deployProxy

Creates a proxy given an ethers contract factory to use as implementation, and returns a contract instance with the proxy address and the implementation interface. If `args` is set, will call an initializer function `initialize` with the supplied args during proxy deployment. Options are:
- `initializer`: sets a different initializer function to call
- `unsafeAllowCustomTypes`: allows a deployment where structs or enums are used in the implementation contract (required since [storage compatibility validations]((../../README.md#what-does-it-mean-for-an-implementation-to-be-compatible)) do not handle custom types, so make sure the change you are introducing is safe)

```ts
async function deployProxy(
  Contract: ethers.ContractFactory,
  args: unknown[] = [],
  opts: { initializer: string, unsafeAllowCustomTypes: boolean } = {},
): Promise<ethers.Contract>
```

### upgradeProxy

Upgrades a proxy at a specified address to a new implementation contract, and returns a contract instance with the proxy address and the new implementation interface. Options are:
- `unsafeAllowCustomTypes`: allows an upgrade where structs or enums are used in the implementation contract (required since [storage compatibility validations]((../../README.md#what-does-it-mean-for-an-implementation-to-be-compatible)) do not handle custom types, so make sure the change you are introducing is safe)

```ts
async function upgradeProxy(
  proxyAddress: string,
  Contract: ethers.ContractFactory,
  opts: { unsafeAllowCustomTypes: boolean } = {},
): Promise<ethers.Contract>
```

### prepareUpgrade

Validates and deploys a new implementation contract, and returns its address. Use this method to prepare an upgrade to be run from an admin address you do not control directly or cannot use from Buidler. Options are:
- `unsafeAllowCustomTypes`: allows an upgrade where structs or enums are used in the implementation contract (required since [storage compatibility validations]((../../README.md#what-does-it-mean-for-an-implementation-to-be-compatible)) do not handle custom types, so make sure the change you are introducing is safe)

```ts
async function prepareUpgrade(
  proxyAddress: string,
  Contract: ethers.ContractFactory,
  opts: { unsafeAllowCustomTypes: boolean } = {},
): Promise<string>
```

### admin.changeAdminForProxy

Changes the admin for a specific proxy. Receives the address of the proxy to change, and the new admin address.

```ts
async function changeAdminForProxy(
  proxyAddress: string,
  newAdmin: string,
): Promise<void>
```

### admin.transferProxyAdminOwnership

Changes the owner of the proxy admin contract, which is the default admin for upgrade rights over all proxies. Receives the new admin address.

```ts
async function transferProxyAdminOwnership(
  newAdmin: string,
): Promise<void>
```

## Learn more

Refer to the project's [main documentation](../../README.md) for more info.
