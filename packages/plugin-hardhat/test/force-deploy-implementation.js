const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
});

test('deployImplementation - both use and force options enabled', async t => {
  const { Greeter } = t.context;

  await t.throwsAsync(
    () => upgrades.deployImplementation(Greeter, { useDeployedImplementation: true, forceDeployImplementation: true }),
    {
      message:
        /(The useDeployedImplementation and forceDeployImplementation options cannot both be set to true at the same time)/,
    },
  );
});

test('deployImplementation - force', async t => {
  const { Greeter } = t.context;

  const impl1 = await upgrades.deployImplementation(Greeter);
  const impl2 = await upgrades.deployImplementation(Greeter, { forceDeployImplementation: true });
  t.not(impl2, impl1);
});

test('deployProxy - force, then upgrade', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeterImplAddr = await upgrades.deployImplementation(Greeter);
  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!'], {
    kind: 'transparent',
    forceDeployImplementation: true,
  });
  t.is(await greeter.greet(), 'Hola mundo!');
  t.not(greeterImplAddr, await upgrades.erc1967.getImplementationAddress(greeter.address));

  // upgrade proxy that had a force deployed implementation
  await upgrades.upgradeProxy(greeter, GreeterV2);
});

test('deployBeacon - force', async t => {
  const { Greeter } = t.context;

  const greeterImplAddr = await upgrades.deployImplementation(Greeter);
  const beacon = await upgrades.deployBeacon(Greeter, { forceDeployImplementation: true });
  t.not(greeterImplAddr, await upgrades.beacon.getImplementationAddress(beacon.address));
});

test('prepareUpgrade - force', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
  const deployedImplAddress = await upgrades.deployImplementation(GreeterV2);
  const preparedImplAddress = await upgrades.prepareUpgrade(greeter, GreeterV2, { forceDeployImplementation: true });
  t.not(preparedImplAddress, deployedImplAddress);
});

test('upgradeProxy - force', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
  const origImplAddress = await upgrades.erc1967.getImplementationAddress(greeter.address);

  const deployedImplAddress = await upgrades.deployImplementation(GreeterV2);
  await upgrades.upgradeProxy(greeter, GreeterV2, { forceDeployImplementation: true });

  const newImplAddress = await upgrades.erc1967.getImplementationAddress(greeter.address);
  t.not(newImplAddress, origImplAddress);
  t.not(newImplAddress, deployedImplAddress);
});

test('upgradeBeacon - force', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter);
  const origImplAddress = await upgrades.beacon.getImplementationAddress(greeterBeacon.address);

  const deployedImplAddress = await upgrades.deployImplementation(GreeterV2);

  await upgrades.upgradeBeacon(greeterBeacon, GreeterV2, { forceDeployImplementation: true });
  const newImplAddress = await upgrades.beacon.getImplementationAddress(greeterBeacon.address);
  t.not(newImplAddress, origImplAddress);
  t.not(newImplAddress, deployedImplAddress);
});
