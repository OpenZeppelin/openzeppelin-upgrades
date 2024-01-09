# <img src="assets/banner.svg" alt="OpenZeppelin Upgrades" height="40px">

[![Docs](https://img.shields.io/badge/docs-%F0%9F%93%84-blue)](https://docs.openzeppelin.com/upgrades-plugins)
[![Coverage Status](https://codecov.io/gh/OpenZeppelin/openzeppelin-upgrades/graph/badge.svg)](https://codecov.io/gh/OpenZeppelin/openzeppelin-upgrades)

**Integrate upgrades into your existing workflow.** Plugins for [Hardhat](https://hardhat.org/) and [Foundry](https://book.getfoundry.sh/) to deploy and manage upgradeable contracts on Ethereum.

- Deploy upgradeable contracts.
- Upgrade deployed contracts.
- Manage proxy admin rights.
- Easily use in tests.

## Installation and Usage

See the documentation for each plugin:

| [<img src="assets/hardhat.svg" height="20px" width="30px" alt="">Hardhat](./packages/plugin-hardhat/README.md)| [<img src="https://avatars.githubusercontent.com/u/99892494?s=20&v=4" height="20px" width="20px" alt=""> Foundry](https://github.com/OpenZeppelin/openzeppelin-foundry-upgrades) |
|-|-|

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

For UUPS and transparent proxies, use `deployProxy` and `upgradeProxy`. For beacon proxies, use `deployBeacon`, `deployBeaconProxy`, and `upgradeBeacon`. See the documentation for [Hardhat Upgrades](./packages/plugin-hardhat/README.md) and [Foundry Upgrades](https://github.com/OpenZeppelin/openzeppelin-foundry-upgrades) for examples.

## Managing ownership

Transparent proxies have an _admin_ address which has the rights to upgrade them. By default, the admin is a [proxy admin contract](https://docs.openzeppelin.com/upgrades-plugins/faq#what-is-a-proxy-admin) deployed behind the scenes. Keep in mind that the _admin_ of a proxy can only upgrade it, but not interact with the implementation contract. Read [here](https://docs.openzeppelin.com/upgrades-plugins/proxies#transparent-proxies-and-function-clashes) for more info on this restriction.

The proxy admin contract also defines an _owner_ address which has the rights to operate it. By default, the proxy admin's owner is the `initialOwner` address used during deployment of the transparent proxy if provided, otherwise it is the externally owned account used during deployment. You can change the proxy admin owner by calling the `admin.transferProxyAdminOwnership` function in the Hardhat plugin, or the `transferOwnership` function of the proxy admin contract if using Foundry.

> [!WARNING]
> Do not reuse an already deployed `ProxyAdmin`. Before `@openzeppelin/contracts` version 5.x, the address provided to transparent proxies was an `initialAdmin` as opposed to an `initialOwner` of a newly deployed `ProxyAdmin`. Reusing a `ProxyAdmin` will disable upgradeability in your contract.

UUPS and beacon proxies do not use admin addresses. UUPS proxies rely on an [`_authorizeUpgrade`](https://docs.openzeppelin.com/contracts/api/proxy#UUPSUpgradeable-_authorizeUpgrade-address-) function to be overridden to include access restriction to the upgrade mechanism, whereas beacon proxies are upgradable only by the owner of their corresponding beacon.

Once you have transferred the rights to upgrade a proxy or beacon to another address, you can still use your local setup to validate and deploy the implementation contract. The plugins include a `prepareUpgrade` function that will validate that the new implementation is upgrade-safe and compatible with the previous one, and deploy it using your local Ethereum account. You can then execute the upgrade itself from the admin or owner address. You can also use the `defender.proposeUpgrade` or `defender.proposeUpgradeWithApproval` functions to automatically set up the upgrade in [OpenZeppelin Defender](https://docs.openzeppelin.com/defender/).

## Community

Join the [OpenZeppelin forum](https://forum.openzeppelin.com/) to ask questions or discuss about these plugins, smart contracts upgrades, or anything related to Ethereum development!

## License

OpenZeppelin Upgrade plugins are released under the [MIT License](LICENSE).
