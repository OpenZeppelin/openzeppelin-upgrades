const assert = require('assert');

const { deployProxy, upgradeProxy, prepareUpgrade } = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('GreeterProxiable');
const GreeterV3 = artifacts.require('GreeterV3Proxiable');
const GreeterStorageConflict = artifacts.require('GreeterStorageConflictProxiable');

contract('Greeter', function () {
  it('dry run upgradeProxy', async function () {
    const greeter = await deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
    const greeter3 = await upgradeProxy(greeter, GreeterV3, { dryRun: true });

    // Since the upgrade was run in dry mode, this should revert
    await assert.rejects(greeter3.resetGreeting(), error => error.message.includes('revert'));
  });

  it('dry run prepareUpgrade', async function () {
    const greeter = await deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
    let greeter3ImplAddr = await prepareUpgrade(greeter.address, GreeterV3, { dryRun: true });
    let greeter3 = await GreeterV3.at(greeter3ImplAddr);

    // Since the upgrade was run in dry mode, this should revert
    await assert.rejects(greeter3.resetGreeting(), error => error.message.includes('revert'));
  });

  it('dry run catches storage conflict', async function () {
    const greeter = await deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
    await assert.rejects(
      () => upgradeProxy(greeter, GreeterStorageConflict, { dryRun: true }),
      error => error.message.includes('New storage layout is incompatible'),
    );
  });
});
