const assert = require('assert');
const { ethers, upgrades } = require('@nomiclabs/buidler');

async function main() {
  const InitializerOverloaded = await ethers.getContractFactory('InitializerOverloaded');
  const instance = await upgrades.deployProxy(InitializerOverloaded, [42], { initializer: 'initialize(uint256)' });
  assert.strictEqual('42', (await instance.x()).toString());

  const InitializerMissing = await ethers.getContractFactory('InitializerMissing');
  await upgrades.deployProxy(InitializerMissing);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
