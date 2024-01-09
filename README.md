# <img src="assets/banner.svg" alt="OpenZeppelin Upgrades" height="40px">

[![Docs](https://img.shields.io/badge/docs-%F0%9F%93%84-blue)](https://docs.openzeppelin.com/upgrades-plugins)
[![Coverage Status](https://codecov.io/gh/OpenZeppelin/openzeppelin-upgrades/graph/badge.svg)](https://codecov.io/gh/OpenZeppelin/openzeppelin-upgrades)

**Integrate upgrades into your existing workflow.** Plugins for [Hardhat](https://hardhat.org/) and [Foundry](https://github.com/foundry-rs/foundry) to deploy and manage upgradeable contracts on Ethereum.

- Deploy upgradeable contracts.
- Upgrade deployed contracts.
- Manage proxy admin rights.
- Easily use in tests.

## Installation

### Hardhat

```
npm install --save-dev @openzeppelin/hardhat-upgrades
npm install --save-dev @nomicfoundation/hardhat-ethers ethers # peer dependencies
```

```js
// hardhat.config.js
require('@openzeppelin/hardhat-upgrades');
```

### Foundry

```
forge install OpenZeppelin/openzeppelin-foundry-upgrades
forge install OpenZeppelin/openzeppelin-contracts-upgradeable
```

Set the following in `remappings.txt`, replacing any previous definitions of these remappings:
```
@openzeppelin/contracts/=lib/openzeppelin-contracts-upgradeable/lib/openzeppelin-contracts/contracts/
@openzeppelin/contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/contracts/
```

## Usage

See the documentation for each plugin:

| [Hardhat](./packages/plugin-hardhat/README.md)| [Foundry](https://github.com/OpenZeppelin/openzeppelin-foundry-upgrades) |
|-|-|

You can write [Hardhat scripts](https://hardhat.org/guides/scripts.html) or [Forge scripts](https://book.getfoundry.sh/tutorials/solidity-scripting) that use the plugin to deploy or upgrade a contract.

For example, with Hardhat:

```js
const { ethers, upgrades } = require("hardhat");

async function main() {
  // Deploying
  const Box = await ethers.getContractFactory("Box");
  const instance = await upgrades.deployProxy(Box, [42]);
  await instance.waitForDeployment();

  // Upgrading
  const BoxV2 = await ethers.getContractFactory("BoxV2");
  const upgraded = await upgrades.upgradeProxy(await instance.getAddress(), BoxV2);
}

main();
```

You can use the plugin in your tests to ensure everything works as expected.

```js
it('works before and after upgrading', async function () {
  const instance = await upgrades.deployProxy(Box, [42]);
  assert.strictEqual(await instance.retrieve(), 42);
  
  await upgrades.upgradeProxy(instance, BoxV2);
  assert.strictEqual(await instance.retrieve(), 42);
});
```

## How do the plugins work?

The plugins provide functions which take care of managing upgradeable deployments of your contracts.

For example, `deployProxy` does the following:

1. Validates that the implementation is [upgrade safe](https://docs.openzeppelin.com/upgrades-plugins/faq#what-does-it-mean-for-a-contract-to-be-upgrade-safe).

2. Deploys the [implementation contract](https://docs.openzeppelin.com/upgrades-plugins/faq#what-is-an-implementation-contract). Note that the Hardhat plugin first checks if there is an implementation contract deployed with the same bytecode, and skips this step if one is already deployed.

3. Creates and initializes the proxy contract, along with a [proxy admin](https://docs.openzeppelin.com/upgrades-plugins/faq#what-is-a-proxy-admin) (if needed).

And when you call `upgradeProxy`:

1. Validates that the new implementation is [upgrade safe](https://docs.openzeppelin.com/upgrades-plugins/faq#what-does-it-mean-for-a-contract-to-be-upgrade-safe) and is [compatible](https://docs.openzeppelin.com/upgrades-plugins/faq#what-does-it-mean-for-an-implementation-to-be-compatible) with the previous one.

2. Deploys the new [implementation contract](https://docs.openzeppelin.com/upgrades-plugins/faq#what-is-an-implementation-contract). Note that the Hardhat plugin first checks if there is an implementation contract deployed with the same bytecode, and skips this step if one is already deployed.

3. Upgrades the proxy to use the new implementation contract.

The Hardhat plugin keeps track of all the implementation contracts you have deployed in an `.openzeppelin` folder in the project root. You will find one file per network there. It is advised that you commit to source control the files for all networks except the development ones (you may see them as `.openzeppelin/unknown-*.json`).

The Foundry plugin does not keep track of implementation contracts, but requires you to [define reference contracts](https://github.com/OpenZeppelin/openzeppelin-foundry-upgrades?tab=readme-ov-file#before-running) in order to validate new versions of implementations for upgrade safety.

## Proxy patterns

The plugins support the UUPS, transparent, and beacon proxy patterns. UUPS and transparent proxies are upgraded individually, whereas any number of beacon proxies can be upgraded atomically at the same time by upgrading the beacon that they point to. For more details on the different proxy patterns available, see the documentation for [Proxies](https://docs.openzeppelin.com/contracts/api/proxy).

For UUPS and transparent proxies, use `deployProxy` and `upgradeProxy` as shown above. For beacon proxies, use `deployBeacon`, `deployBeaconProxy`, and `upgradeBeacon`. See the documentation for [Hardhat Upgrades](./packages/plugin-hardhat/README.md) and [Foundry Upgrades](https://github.com/OpenZeppelin/openzeppelin-foundry-upgrades) for examples.

## Managing ownership

Transparent proxies have an _admin_ address which has the rights to upgrade them. By default, the admin is a [proxy admin contract](https://docs.openzeppelin.com/upgrades-plugins/faq#what-is-a-proxy-admin) deployed behind the scenes. Keep in mind that the _admin_ of a proxy can only upgrade it, but not interact with the implementation contract. Read [here](https://docs.openzeppelin.com/upgrades-plugins/proxies#transparent-proxies-and-function-clashes) for more info on this restriction.

The proxy admin contract also defines an _owner_ address which has the rights to operate it. By default, this address is the `initialOwner` address used during deployment of the transparent proxy if provided, otherwise it is the externally owned account used during deployment. You can change the proxy admin owner by calling the `admin.transferProxyAdminOwnership` function in the Hardhat plugin, or the `transferOwnership` function of the proxy admin contract in Foundry.

UUPS and beacon proxies do not use admin addresses. UUPS proxies rely on an [`_authorizeUpgrade`](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable-_authorizeUpgrade-address-) function to be overridden to include access restriction to the upgrade mechanism, whereas beacon proxies are upgradable only by the owner of their corresponding beacon.

Once you have transferred the rights to upgrade a proxy or beacon to another address, you can still use your local setup to validate and deploy the implementation contract. The plugins include a `prepareUpgrade` function that will validate that the new implementation is upgrade-safe and compatible with the previous one, and deploy it using your local Ethereum account. You can then execute the upgrade itself from the admin or owner address. You can also use the `proposeUpgrade` or `proposeUpgradeWithApproval` functions to automatically set up the upgrade in [Defender](https://www.openzeppelin.com/defender).

## Community

Join the [OpenZeppelin forum](https://forum.openzeppelin.com/) to ask questions or discuss about these plugins, smart contracts upgrades, or anything related to Ethereum development!

## License

OpenZeppelin Upgrade plugins are released under the [MIT License](LICENSE).
