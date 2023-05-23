const assert = require('assert');

const {
  deployProxy,
  deployBeacon,
  deployImplementation,
  upgradeProxy,
  upgradeBeacon,
  erc1967,
  prepareUpgrade,
  beacon,
} = require('@openzeppelin/truffle-upgrades');

const GreeterDeployImpl = artifacts.require('GreeterDeployImpl');
const GreeterV2DeployImpl = artifacts.require('GreeterV2DeployImpl');
const GreeterV3DeployImpl = artifacts.require('GreeterV3DeployImpl');

contract('Greeter', function () {
  it('deployImplementation - implementation not deployed', async function () {
    // this isn't a realistic scenario but we should still handle it
    await assert.rejects(deployImplementation(GreeterDeployImpl, { redeployImplementation: 'never' }), error =>
      error.message.includes('The implementation contract was not previously deployed'),
    );
  });

  it('deployProxy - implementation not deployed', async function () {
    await assert.rejects(
      deployProxy(GreeterDeployImpl, ['Hola mundo!'], { kind: 'transparent', redeployImplementation: 'never' }),
      error => error.message.includes('The implementation contract was not previously deployed'),
    );
  });

  it('deployBeacon - implementation not deployed', async function () {
    await assert.rejects(deployBeacon(GreeterDeployImpl, { redeployImplementation: 'never' }), error =>
      error.message.includes('The implementation contract was not previously deployed'),
    );
  });

  it('prepareUpgrade - implementation not deployed', async function () {
    const greeter = await deployProxy(GreeterDeployImpl, ['Hola mundo!'], { kind: 'transparent' });
    await assert.rejects(prepareUpgrade(greeter, GreeterV2DeployImpl, { redeployImplementation: 'never' }), error =>
      error.message.includes('The implementation contract was not previously deployed'),
    );
  });

  it('upgradeProxy - implementation not deployed', async function () {
    const greeter = await deployProxy(GreeterDeployImpl, ['Hola mundo!'], { kind: 'transparent' });
    const origImplAddress = await erc1967.getImplementationAddress(greeter.address);

    const wrongImplAddress = await deployImplementation(GreeterV3DeployImpl); // wrong contract deployed

    await assert.rejects(upgradeProxy(greeter, GreeterV2DeployImpl, { redeployImplementation: 'never' }), error =>
      error.message.includes('The implementation contract was not previously deployed'),
    );
    const newImplAddress = await erc1967.getImplementationAddress(greeter.address);
    assert.equal(newImplAddress, origImplAddress);
    assert.notEqual(newImplAddress, wrongImplAddress);
  });

  it('upgradeBeacon - implementation not deployed', async function () {
    const greeterBeacon = await deployBeacon(GreeterDeployImpl);
    const origImplAddress = await beacon.getImplementationAddress(greeterBeacon.address);

    await assert.rejects(
      upgradeBeacon(greeterBeacon, GreeterV2DeployImpl, { redeployImplementation: 'never' }),
      error => error.message.includes('The implementation contract was not previously deployed'),
    );
    const newImplAddress = await beacon.getImplementationAddress(greeterBeacon.address);
    assert.equal(newImplAddress, origImplAddress);
  });

  it('deployImplementation - happy path', async function () {
    const impl1 = await deployImplementation(GreeterDeployImpl);

    // this isn't a realistic scenario but we should still handle it
    const impl2 = await deployImplementation(GreeterDeployImpl, { redeployImplementation: 'never' });
    assert.equal(impl2, impl1);
  });

  it('deployProxy - happy path', async function () {
    const greeterImplAddr = await deployImplementation(GreeterDeployImpl);
    const greeter = await deployProxy(GreeterDeployImpl, ['Hola mundo!'], {
      kind: 'transparent',
      redeployImplementation: 'never',
    });
    assert.equal(await greeter.greet(), 'Hola mundo!');
    assert.equal(greeterImplAddr, await erc1967.getImplementationAddress(greeter.address));
  });

  it('deployBeacon - happy path', async function () {
    const greeterImplAddr = await deployImplementation(GreeterDeployImpl);
    const deployedBeacon = await deployBeacon(GreeterDeployImpl, { redeployImplementation: 'never' });
    assert.equal(greeterImplAddr, await beacon.getImplementationAddress(deployedBeacon.address));
  });

  it('prepareUpgrade - happy path', async function () {
    const greeter = await deployProxy(GreeterDeployImpl, ['Hola mundo!'], { kind: 'transparent' });
    const deployedImplAddress = await deployImplementation(GreeterV2DeployImpl);
    const preparedImplAddress = await prepareUpgrade(greeter, GreeterV2DeployImpl, { redeployImplementation: 'never' });
    assert.equal(preparedImplAddress, deployedImplAddress);
  });

  it('upgradeProxy - happy path', async function () {
    const greeter = await deployProxy(GreeterDeployImpl, ['Hola mundo!'], { kind: 'transparent' });
    const origImplAddress = await erc1967.getImplementationAddress(greeter.address);

    const deployedImplAddress = await deployImplementation(GreeterV2DeployImpl);
    await upgradeProxy(greeter, GreeterV2DeployImpl, { redeployImplementation: 'never' });

    const newImplAddress = await erc1967.getImplementationAddress(greeter.address);
    assert.notEqual(newImplAddress, origImplAddress);
    assert.equal(newImplAddress, deployedImplAddress);
  });

  it('upgradeBeacon - happy path', async function () {
    const greeterBeacon = await deployBeacon(GreeterDeployImpl);
    const origImplAddress = await beacon.getImplementationAddress(greeterBeacon.address);

    const deployedImplAddress = await deployImplementation(GreeterV2DeployImpl);

    await upgradeBeacon(greeterBeacon, GreeterV2DeployImpl, { redeployImplementation: 'never' });
    const newImplAddress = await beacon.getImplementationAddress(greeterBeacon.address);
    assert.notEqual(newImplAddress, origImplAddress);
    assert.equal(newImplAddress, deployedImplAddress);
  });
});
