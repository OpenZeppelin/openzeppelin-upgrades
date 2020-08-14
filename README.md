# OpenZeppelin Upgrades

**Integrate upgrades into your existing workflow.** Plugins for [Buidler](https://buidler.dev/) and [Truffle](https://www.trufflesuite.com/truffle) to deploy and manage upgradeable contracts on Ethereum.

## Quickstart

Install the plugin for your favorite toolchain:
```
npm install --save-dev @openzeppelin/buidler-upgrades
```
```
npm install --save-dev @openzeppelin/truffle-upgrades
```

And set up a [buidler script](https://buidler.dev/guides/scripts.html) to deploy and upgrade, after adding `usePlugin('@openzeppelin/upgrades-buidler')` to your `buidler.config.js`:

```js
const { ethers, upgrades } = require("@nomiclabs/buidler");

async function main() {
  const Box = await ethers.getContractFactory("Box");
  const instance = await upgrades.deployProxy(Box, [42]);
  await instance.deployed();

  const BoxV2 = await ethers.getContractFactory("BoxV2");
  const upgraded = await upgrades.upgradeProxy(instance.address, BoxV2);
  await upgraded.deployed();
}

main();
```

Or a [truffle migration](https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations):

```js
const { deployProxy, upgradeProxy } = require('@openzeppelin/upgrades-truffle');

const Box = artifacts.require('Box');
const BoxV2 = artifacts.require('BoxV2');

module.exports = async function (deployer) {
  const instance = await deployProxy(Box, [42], { deployer });
  const upgraded = await upgradeProxy(instance.address, BoxV2, { deployer });
}
```

## Usage

Refer to the documentation of each plugin:

[![buidler](./assets/buidler.png "buidler")](./packages/plugin-buidler/README.md)
&nbsp;&nbsp;&nbsp;&nbsp;
[![truffle](./assets/truffle.png "truffle")](./packages/plugin-truffle/README.md)

## How do the plugins work?

Both plugins provide two main functions, `deployProxy` and `upgradeProxy`, which take care of managing upgradeable deployments of your contracts. In the case of `deployProxy`, this means:

1. Validate that the implementation is [upgrade safe](#what-does-it-mean-for-a-contract-to-be-upgrade-safe)

2. Deploy a [proxy admin](#what-is-a-proxy-admin) for your project

3. Deploy the [implementation contract](#what-is-an-implementation-contract)

4. Create and initialize the proxy contract

And when you call `upgradeProxy`:

1. Validate that the new implementation is [upgrade safe](#what-does-it-mean-for-a-contract-to-be-upgrade-safe) and is [compatible](#what-does-it-mean-for-an-implementation-to-be-compatible) with the previous one

2. Check if there is an [implementation contract](#what-is-an-implementation-contract) deployed with the same bytecode, and deploy one if not

3. Upgrade the proxy to use the new implementation contract

The plugins will keep track of all the implementation contracts you have deployed in an `.openzeppelin` folder in the project root, as well as the proxy admin. You will find one file per network there. It is advised that you commit to source control the files for all networks except the development ones (you may see them as `.openzeppelin/unknown-*.json`).

> Note: the format of the files within the `.openzeppelin` folder is not compatible with those of the [OpenZeppelin CLI](https://docs.openzeppelin.com/cli/2.8/). If you want to use these plugins for an existing OpenZeppelin CLI project, we will be sharing soon a guide on how to migrate.

## Managing ownership

All proxies define an _admin_ address which has the rights to upgrade them. By default, the admin is a [proxy admin contract](#what-is-a-proxy-admin) deployed behind the scenes. You can change the admin of a proxy by calling the `admin.changeAdminForProxy` function in the plugin. Keep in mind that the _admin_ of a proxy can only upgrade it, but not interact with the implementation contract. Read [here](https://docs.openzeppelin.com/upgrades/2.8/proxies#transparent-proxies-and-function-clashes) for more info on this restriction.

The proxy admin contract also defines an _owner_ address which has the rights to operate it. By default, this address is the externally owned account used during deployment. You can change the proxy admin owner by calling the `admin.transferProxyAdminOwnership` function in the plugin. Note that changing the proxy admin owner effectively transfers the power to upgrade any proxy in your whole project to the new owner, so use with care.

Once you have transferred the rights to upgrade a proxy to another address, you can still use your local setup to validate and deploy the implementation contract. The plugins include a `prepareUpgrade` function that will validate that the new implementation is upgrade-safe and compatible with the previous one, and deploy it using your local Ethereum account. You can then execute the upgrade itself from the admin address.

Refer to each plugin documentation for more details on the `admin` functions.

## FAQ

### What does it mean for a contract to be upgrade safe?

When deploying a proxy for a contract, there are some limitations to the contract code. In particular, the contract cannot have a constructor, and should not use the `selfdestruct` or `delegatecall` operations for security reasons.

As a replacement for the constructor, it is common to set up an `initialize` function to take care of the contract's initialization. You can use the [`Initializable`](https://docs.openzeppelin.com/upgrades/2.8/writing-upgradeable#initializers) base contract to have access to an `initializer` modifier that ensures the function is only called once.

```solidity
import "@openzeppelin/upgrades-core/contracts/Initializable.sol";
// Alternatively, if you are using @openzeppelin/contracts-ethereum-package:
// import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

contract MyContract is Initializable {
  uint256 value;
  function initialize(uint256 initialValue) public initializer {
    value = initialValue;
  }
}
```

Both plugins will validate that the contract you are trying to deploy complies with these rules. You can read more about how to write upgrade safe contracts [here](https://docs.openzeppelin.com/upgrades/2.8/writing-upgradeable).

### What does it mean for an implementation to be compatible?

When upgrading a proxy from one implementation to another, the _storage layout_ of both implementations must be compatible. This means that, even though you can completely change the code of the implementation, you cannot modify the existing contract state variables. The only operation allowed is to append new state variables after the ones already declared.

Both plugins will validate that the new implementation contract is compatible with the previous one. However, the plugins currently do not support validating custom types (enums or structs). To force a deployment where custom types are involved, set the `unsafeAllowCustomTypes` flag to true in the `deployProxy` or `upgradeProxy` call.

You can read more about how to make storage-compatible changes to an implementation contract [here](https://docs.openzeppelin.com/upgrades/2.8/writing-upgradeable#modifying-your-contracts).

### What is a proxy admin?

A [`ProxyAdmin`](packages/core/contracts/proxy/ProxyAdmin.sol) is a contract that acts as the owner of all your proxies. Only one per network gets deployed. When you start your project, the `ProxyAdmin` is owned by the deployer address, but you can transfer ownership of it by calling [`transferOwnership`](https://docs.openzeppelin.com/contracts/3.x/api/access#Ownable-transferOwnership-address-).

You can read more about this contract [here](https://docs.openzeppelin.com/cli/2.8/contracts-architecture#proxyadmin.sol).

### What is an implementation contract?

Upgradeable deployments require at least two contracts: a proxy and an implementation. The proxy contract is the instance you and your users will interact with, and the implementation is the contract that holds the code. If you call `deployProxy` several times for the same implementation contract, several proxies will be deployed, but only one implementation contract will be used.

When you upgrade a proxy to a new version, a new implementation contract is deployed if needed, and the proxy is set to use the new implementation contract. You can read more about the proxy upgrade pattern [here](https://docs.openzeppelin.com/upgrades/2.8/proxies).

### What is a proxy?

A proxy is a contract that delegates all of its calls to a second contract, named an implementation contract. All state and funds are held in the proxy, but the code actually executed is that of the implementation. A proxy can be _upgraded_ by its admin to use a different implementation contract.

You can read more about the proxy upgrade pattern [here](https://docs.openzeppelin.com/upgrades/2.8/proxies).

## Community

Join the [OpenZeppelin forum](https://forum.openzeppelin.com/) to ask questions or discuss about these plugins, smart contracts upgrades, or anything related to Ethereum development!

## License

OpenZeppelin Upgrade plugins are released under the [MIT License](LICENSE).
