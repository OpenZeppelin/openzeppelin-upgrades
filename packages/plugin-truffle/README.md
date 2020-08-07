# OpenZeppelin Truffle Upgrades

**Truffle package for deploying and managing upgradeable contracts.** This package adds functions to your truffle migrations and tests so you can deploy and upgrade proxies for your contracts.

> Note: Usage from [truffle external scripts](https://www.trufflesuite.com/docs/truffle/getting-started/writing-external-scripts) is not yet supported.

## Installation

```
npm install --save-dev @openzeppelin/truffle-upgrades
```

This package requires truffle [version 5.1.35](https://github.com/trufflesuite/truffle/releases/tag/v5.1.35) or greater.

## Usage in migrations

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

## Usage in tests

You can also use the `deployProxy` and `upgradeProxy` functions from your truffle tests, in case you want to add tests for upgrading your contracts (which you should!). The API is the same as in the migrations, only that without a `deployer` parameter.

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

## API

Both `deployProxy` and `upgradeProxy` functions will return instances of [truffle contracts](https://www.trufflesuite.com/docs/truffle/reference/contract-abstractions), and require truffle contract classes (retrieved via `artifacts.require`) as arguments.

### deployProxy

Creates a proxy given a truffle contract class to use as implementation, and returns a contract instance with the proxy address and the implementation interface. During a migration, the proxy address will be stored in the implementation contract's artifact, so you can use Truffle's [`deployed()`](https://www.trufflesuite.com/docs/truffle/reference/contract-abstractions#-code-mycontract-deployed-code-) function to load it.

If `args` is set, will call an initializer function `initialize` with the supplied `args` during proxy deployment. 

Options for this function are:
- `initializer`: sets a different initializer function to call
- `deployer`: set as the truffle migration deployer during migrations
- `unsafeAllowCustomTypes`: allows a deployment where structs or enums are used in the implementation contract (required since [storage compatibility validations]((../../README.md#what-does-it-mean-for-an-implementation-to-be-compatible)) do not handle custom types, so make sure the change you are introducing is safe)


```ts
async function deployProxy(
  Contract: ContractClass,
  args: unknown[] = [],
  opts: { deployer: Deployer, initializer: string, unsafeAllowCustomTypes: boolean } = {},
): Promise<ContractInstance>
```

### upgradeProxy

Upgrades a proxy at a specified address to a new implementation contract, and returns a contract instance with the proxy address and the new implementation interface. 

Options for this function are:
- `deployer`: set as the truffle migration deployer during migrations
- `unsafeAllowCustomTypes`: allows an upgrade where structs or enums are used in the implementation contract (required since [storage compatibility validations]((../../README.md#what-does-it-mean-for-an-implementation-to-be-compatible)) do not handle custom types, so make sure the change you are introducing is safe)

```ts
async function upgradeProxy(
  proxyAddress: string,
  Contract: ContractClass,
  opts: { deployer: Deployer, unsafeAllowCustomTypes: boolean } = {},
): Promise<ContractInstance>
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
