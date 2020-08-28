# <img src="assets/banner.svg" alt="OpenZeppelin Upgrades" height="40px">

**Integrate upgrades into your existing workflow.** Plugins for [Buidler](https://buidler.dev/) and [Truffle](https://www.trufflesuite.com/truffle) to deploy and manage upgradeable contracts on Ethereum.

- Deploy upgradeable contracts.
- Upgrade deployed contracts.
- Manage proxy admin rights.
- Easily use in tests.

## Installation

### Buidler

```
npm install --save-dev @openzeppelin/buidler-upgrades @nomiclabs/buidler-ethers ethers
```

This installs our Buidler plugin along with the necessary peer dependencies.

### Truffle

```
npm install --save-dev @openzeppelin/truffle-upgrades
```

## Usage

See the documentation for each plugin, or take a look at the sample code snippets below.

| [<img src="assets/buidler.svg" height="20px" width="30px" alt="">Buidler](./packages/plugin-buidler/README.md)| [<img src="assets/truffle.svg" height="20px" width="30px" alt="">Truffle](./packages/plugin-truffle/README.md) |
|-|-|

Buidler users will be able to write [scripts](https://buidler.dev/guides/scripts.html) that use the plugin to deploy or upgrade a contract, and manage proxy admin rights.

```js
const { ethers, upgrades } = require("@nomiclabs/buidler");

async function main() {
  // Deploying
  const Box = await ethers.getContractFactory("Box");
  const instance = await upgrades.deployProxy(Box, [42]);
  await instance.deployed();

  // Upgrading
  const BoxV2 = await ethers.getContractFactory("BoxV2");
  const upgraded = await upgrades.upgradeProxy(instance.address, BoxV2);
}

main();
```

Truffle users will be able to write [migrations](https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations) that use the plugin to deploy or upgrade a contract, or manage proxy admin rights.

```js
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Box = artifacts.require('Box');
const BoxV2 = artifacts.require('BoxV2');

module.exports = async function (deployer) {
  const instance = await deployProxy(Box, [42], { deployer });
  const upgraded = await upgradeProxy(instance.address, BoxV2, { deployer });
}
```

Whether you're using Buidler or Truffle, you can use the plugin in your tests to ensure everything works as expected.

```js
it('works before and after upgrading', async function () {
  const instance = await upgrades.deployProxy(Box, [42]);
  assert.strictEqual(await instance.retrieve(), 42);
  
  await upgrades.upgradeProxy(instance.address, BoxV2);
  assert.strictEqual(await instance.retrieve(), 42);
});
```

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

### Why can't I use `immutable` variables?

Solidity 0.6.5 [introduced the `immutable` keyword]([https://github.com/ethereum/solidity/releases/tag/v0.6.5](https://github.com/ethereum/solidity/releases/tag/v0.6.5)) to declare a variable that can be assigned only once during construction and can be read only after construction. It does so by calculating its value during contract creation and storing its value directly into the bytecode. 

Notice that this behavior is incompatible with the way upgradeable contracts work for two reasons:

1. Upgradeable contracts have no constructors but initializers, therefore they can't handle immutable variables.
2. Since the immutable variable value is stored in the bytecode its value would be shared among all proxies pointing to a given contract instead of each proxy's storage.

### Why can't I use external libraries?

At the moment the plugins do not support upgradeable contracts linked to external libraries. This is because it's not known at compile time what implementation is going to be linked thus making very difficult to guarantee the safety of the upgrade operation.

There are plans to add this functionality in the near future with certain constraints that make the issue easier to address like assuming that the external library's source code is either present in the codebase or that it's been deployed and mined so it can be fetched from the blockchain for analysis.

You can follow or contribute to [this issue in Github](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/52).

### Why can't I use custom types like structs and enums?

At the moment the plugins do not support upgradeable contracts that implement or make use of custom types like structs or enums in their code or linked libraries. This is because of the additional complexity of checking for storage layout incompatibilities during an upgrade. (See ["What does it mean for an implementation to be compatible?"](#what-does-it-mean-for-an-implementation-to-be-compatible).)

In the mean time, we encourage users to either avoid using these kind of types or to manually check for [storage incompatibilities](https://docs.openzeppelin.com/upgrades/2.8/writing-upgradeable#modifying-your-contracts) and make use of the `unsafeAllowCustomTypes` flag available for the `deployProxy`, `upgradeProxy` and `prepareUpgrade` functions. If you're unsure about how to do this manual check, we'll be happy to help out with your situation if you [post in the forum](https://forum.openzeppelin.com).

You can follow or contribute to [this issue in Github](https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/95).

### Why do I have to recompile all contracts for Truffle?

Truffle artifacts (the JSON files in `build/contracts`) contain the AST (abstract syntax tree) for each of your contracts. Our plugin uses this information to validate that your contracts are [upgrade safe](#what-does-it-mean-for-a-contract-to-be-upgrade-safe).

Truffle sometimes partially recompiles only the contracts that have changed. We will ask you to trigger a full recompilation either using `truffle compile --all` or deleting the `build/contracts` directory when this happens. The technical reason is that since Solidity does not produce deterministic ASTs, the plugins are unable to resolve references correctly if they are not from the same compiler run.

## Community

Join the [OpenZeppelin forum](https://forum.openzeppelin.com/) to ask questions or discuss about these plugins, smart contracts upgrades, or anything related to Ethereum development!

## License

OpenZeppelin Upgrade plugins are released under the [MIT License](LICENSE).
