const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
});

test('deployImplementation - both useDeployedImplementation and redeployImplementation options enabled', async t => {
  const { Greeter } = t.context;

  await t.throwsAsync(
    () => upgrades.deployImplementation(Greeter, { useDeployedImplementation: true, redeployImplementation: 'always' }),
    {
      message: /(The useDeployedImplementation and redeployImplementation options cannot both be set at the same time)/,
    },
  );
});

test('deployImplementation - redeploy', async t => {
  const { Greeter } = t.context;

  const impl1 = await upgrades.deployImplementation(Greeter);
  const impl2 = await upgrades.deployImplementation(Greeter, { redeployImplementation: 'always' });
  t.not(impl2, impl1);
});

test('deployProxy - redeploy, then upgrade', async t => {
  const { Greeter, GreeterV2 } = t.context;

  // predeploy an impl
  const greeterImplAddr = await upgrades.deployImplementation(Greeter);

  // deploy first proxy with existing impl
  const greeter1 = await upgrades.deployProxy(Greeter, ['Hola mundo!'], {
    kind: 'transparent',
  });
  t.is(await greeter1.greet(), 'Hola mundo!');
  t.is(greeterImplAddr, await upgrades.erc1967.getImplementationAddress(await greeter1.getAddress()));

  // deploy second proxy with redeployed impl
  const greeter2 = await upgrades.deployProxy(Greeter, ['Hola mundo!'], {
    kind: 'transparent',
    redeployImplementation: 'always',
  });
  t.is(await greeter2.greet(), 'Hola mundo!');
  t.not(greeterImplAddr, await upgrades.erc1967.getImplementationAddress(await greeter2.getAddress()));

  // both proxies should be upgradable
  await upgrades.upgradeProxy(greeter1, GreeterV2);
  await upgrades.upgradeProxy(greeter2, GreeterV2);
});

test('deployBeacon - redeploy', async t => {
  const { Greeter } = t.context;

  const greeterImplAddr = await upgrades.deployImplementation(Greeter);
  const beacon = await upgrades.deployBeacon(Greeter, { redeployImplementation: 'always' });
  t.not(greeterImplAddr, await upgrades.beacon.getImplementationAddress(await beacon.getAddress()));
});

test('prepareUpgrade - redeploy', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
  const deployedImplAddress = await upgrades.deployImplementation(GreeterV2);
  const preparedImplAddress = await upgrades.prepareUpgrade(greeter, GreeterV2, { redeployImplementation: 'always' });
  t.not(preparedImplAddress, deployedImplAddress);
});

test('upgradeProxy - redeploy', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
  const origImplAddress = await upgrades.erc1967.getImplementationAddress(await greeter.getAddress());

  const deployedImplAddress = await upgrades.deployImplementation(GreeterV2);
  await upgrades.upgradeProxy(greeter, GreeterV2, { redeployImplementation: 'always' });

  const newImplAddress = await upgrades.erc1967.getImplementationAddress(await greeter.getAddress());
  t.not(newImplAddress, origImplAddress);
  t.not(newImplAddress, deployedImplAddress);
});

test('upgradeBeacon - redeploy', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter);
  const origImplAddress = await upgrades.beacon.getImplementationAddress(await greeterBeacon.getAddress());

  const deployedImplAddress = await upgrades.deployImplementation(GreeterV2);

  await upgrades.upgradeBeacon(greeterBeacon, GreeterV2, { redeployImplementation: 'always' });
  const newImplAddress = await upgrades.beacon.getImplementationAddress(await greeterBeacon.getAddress());
  t.not(newImplAddress, origImplAddress);
  t.not(newImplAddress, deployedImplAddress);
});
