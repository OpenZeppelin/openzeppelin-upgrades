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

contract('Greeter', function () {
  it('deployImplementation - both useDeployedImplementation and redeployImplementation options enabled', async function () {
    // this isn't a realistic scenario but we should still handle it
    await assert.rejects(
      deployImplementation(GreeterDeployImpl, { useDeployedImplementation: true, redeployImplementation: 'always' }),
      error =>
        error.message.includes(
          'The useDeployedImplementation and redeployImplementation options cannot both be set at the same time',
        ),
    );
  });

  it('deployImplementation - redeploy', async function () {
    const impl1 = await deployImplementation(GreeterDeployImpl);
    const impl2 = await deployImplementation(GreeterDeployImpl, { redeployImplementation: 'always' });
    assert.notEqual(impl2, impl1);
  });

  it('deployProxy - redeploy, then upgrade', async function () {
    // predeploy an impl
    const greeterImplAddr = await deployImplementation(GreeterDeployImpl);

    // deploy first proxy with existing impl
    const greeter1 = await deployProxy(GreeterDeployImpl, ['Hola mundo!'], {
      kind: 'transparent',
    });
    assert.equal(await greeter1.greet(), 'Hola mundo!');
    assert.equal(greeterImplAddr, await erc1967.getImplementationAddress(greeter1.address));

    // deploy second proxy with redeployed impl
    const greeter2 = await deployProxy(GreeterDeployImpl, ['Hola mundo!'], {
      kind: 'transparent',
      redeployImplementation: 'always',
    });
    assert.equal(await greeter2.greet(), 'Hola mundo!');
    assert.notEqual(greeterImplAddr, await erc1967.getImplementationAddress(greeter2.address));

    // both proxies should be upgradable
    await upgradeProxy(greeter1, GreeterV2DeployImpl);
    await upgradeProxy(greeter2, GreeterV2DeployImpl);
  });

  it('deployBeacon - redeploy', async function () {
    const greeterImplAddr = await deployImplementation(GreeterDeployImpl);
    const deployedBeacon = await deployBeacon(GreeterDeployImpl, { redeployImplementation: 'always' });
    assert.notEqual(greeterImplAddr, await beacon.getImplementationAddress(deployedBeacon.address));
  });

  it('prepareUpgrade - redeploy', async function () {
    const greeter = await deployProxy(GreeterDeployImpl, ['Hola mundo!'], { kind: 'transparent' });
    const deployedImplAddress = await deployImplementation(GreeterV2DeployImpl);
    const preparedImplAddress = await prepareUpgrade(greeter, GreeterV2DeployImpl, {
      redeployImplementation: 'always',
    });
    assert.notEqual(preparedImplAddress, deployedImplAddress);
  });

  it('upgradeProxy - redeploy', async function () {
    const greeter = await deployProxy(GreeterDeployImpl, ['Hola mundo!'], { kind: 'transparent' });
    const origImplAddress = await erc1967.getImplementationAddress(greeter.address);

    const deployedImplAddress = await deployImplementation(GreeterV2DeployImpl);
    await upgradeProxy(greeter, GreeterV2DeployImpl, { redeployImplementation: 'always' });

    const newImplAddress = await erc1967.getImplementationAddress(greeter.address);
    assert.notEqual(newImplAddress, origImplAddress);
    assert.notEqual(newImplAddress, deployedImplAddress);
  });

  it('upgradeBeacon - redeploy', async function () {
    const greeterBeacon = await deployBeacon(GreeterDeployImpl);
    const origImplAddress = await beacon.getImplementationAddress(greeterBeacon.address);

    const deployedImplAddress = await deployImplementation(GreeterV2DeployImpl);

    await upgradeBeacon(greeterBeacon, GreeterV2DeployImpl, { redeployImplementation: 'always' });
    const newImplAddress = await beacon.getImplementationAddress(greeterBeacon.address);
    assert.notEqual(newImplAddress, origImplAddress);
    assert.notEqual(newImplAddress, deployedImplAddress);
  });
});
