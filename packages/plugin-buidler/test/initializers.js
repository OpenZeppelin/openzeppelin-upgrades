const assert = require('assert');
const { ethers, upgrades } = require('@nomiclabs/buidler');

async function main() {
  const InitializerOverloaded = await ethers.getContractFactory('InitializerOverloaded');

  try {
    await upgrades.deployProxy(InitializerOverloaded, [42]);
    assert.fail('did not fail with overloaded initialize function');
  } catch (e) {
    assert(e.message.includes('multiple matching functions'));
  }

  const instance = await upgrades.deployProxy(InitializerOverloaded, [42], { initializer: 'initialize(uint256)' });
  assert.strictEqual('42', (await instance.x()).toString());

  const InitializerMissing = await ethers.getContractFactory('InitializerMissing');
  await upgrades.deployProxy(InitializerMissing);

  try {
    await upgrades.deployProxy(InitializerMissing, [42]);
    assert.fail('did not fail with missing initialize function');
  } catch (e) {
    assert(e.message.includes('no matching function'));
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
