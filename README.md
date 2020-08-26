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

## Community

Join the [OpenZeppelin forum](https://forum.openzeppelin.com/) to ask questions or discuss about these plugins, smart contracts upgrades, or anything related to Ethereum development!

## License

OpenZeppelin Upgrade plugins are released under the [MIT License](LICENSE).
