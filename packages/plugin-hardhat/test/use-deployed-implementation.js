const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3');
});

test('deployImplementation - implementation not deployed', async t => {
  const { Greeter } = t.context;

  // this isn't a realistic scenario but we should still handle it
  await t.throwsAsync(() => upgrades.deployImplementation(Greeter, { useDeployedImplementation: true }), {
    message: /(The implementation contract was not previously deployed.)/,
  });
});

test('deployProxy - implementation not deployed', async t => {
  const { Greeter } = t.context;

  await t.throwsAsync(
    () => upgrades.deployProxy(Greeter, ['Hola mundo!'], { kind: 'transparent', useDeployedImplementation: true }),
    { message: /(The implementation contract was not previously deployed.)/ },
  );
});

test('deployBeacon - implementation not deployed', async t => {
  const { Greeter } = t.context;

  await t.throwsAsync(() => upgrades.deployBeacon(Greeter, { useDeployedImplementation: true }), {
    message: /(The implementation contract was not previously deployed.)/,
  });
});

test('prepareUpgrade - implementation not deployed', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });

  await t.throwsAsync(() => upgrades.prepareUpgrade(greeter, GreeterV2, { useDeployedImplementation: true }), {
    message: /(The implementation contract was not previously deployed.)/,
  });
});

test('upgradeProxy - implementation not deployed', async t => {
  const { Greeter, GreeterV2, GreeterV3 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
  const origImplAddress = await upgrades.erc1967.getImplementationAddress(greeter.address);

  const wrongImplAddress = await upgrades.deployImplementation(GreeterV3); // wrong contract deployed

  await t.throwsAsync(() => upgrades.upgradeProxy(greeter, GreeterV2, { useDeployedImplementation: true }), {
    message: /(The implementation contract was not previously deployed.)/,
  });
  const newImplAddress = await upgrades.erc1967.getImplementationAddress(greeter.address);
  t.is(newImplAddress, origImplAddress);
  t.not(newImplAddress, wrongImplAddress);
});

test('upgradeBeacon - implementation not deployed', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter);
  const origImplAddress = await upgrades.beacon.getImplementationAddress(greeterBeacon.address);

  await t.throwsAsync(() => upgrades.upgradeBeacon(greeterBeacon, GreeterV2, { useDeployedImplementation: true }), {
    message: /(The implementation contract was not previously deployed.)/,
  });
  const newImplAddress = await upgrades.beacon.getImplementationAddress(greeterBeacon.address);
  t.is(newImplAddress, origImplAddress);
});

test('deployImplementation - happy path', async t => {
  const { Greeter } = t.context;

  const impl1 = await upgrades.deployImplementation(Greeter);
  // this isn't a realistic scenario but we should still handle it
  const impl2 = await upgrades.deployImplementation(Greeter, { useDeployedImplementation: true });
  t.is(impl2, impl1);
});

test('deployProxy - happy path', async t => {
  const { Greeter } = t.context;

  const greeterImplAddr = await upgrades.deployImplementation(Greeter);
  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!'], {
    kind: 'transparent',
    useDeployedImplementation: true,
  });
  t.is(await greeter.greet(), 'Hola mundo!');
  t.is(greeterImplAddr, await upgrades.erc1967.getImplementationAddress(greeter.address));
});

test('deployBeacon - happy path', async t => {
  const { Greeter } = t.context;

  const greeterImplAddr = await upgrades.deployImplementation(Greeter);
  const beacon = await upgrades.deployBeacon(Greeter, { useDeployedImplementation: true });
  t.is(greeterImplAddr, await upgrades.beacon.getImplementationAddress(beacon.address));
});

test('prepareUpgrade - happy path', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
  const deployedImplAddress = await upgrades.deployImplementation(GreeterV2);
  const preparedImplAddress = await upgrades.prepareUpgrade(greeter, GreeterV2, { useDeployedImplementation: true });
  t.is(preparedImplAddress, deployedImplAddress);
});

test('upgradeProxy - happy path', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
  const origImplAddress = await upgrades.erc1967.getImplementationAddress(greeter.address);

  const deployedImplAddress = await upgrades.deployImplementation(GreeterV2);
  await upgrades.upgradeProxy(greeter, GreeterV2, { useDeployedImplementation: true });

  const newImplAddress = await upgrades.erc1967.getImplementationAddress(greeter.address);
  t.not(newImplAddress, origImplAddress);
  t.is(newImplAddress, deployedImplAddress);
});

test('upgradeBeacon - happy path', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter);
  const origImplAddress = await upgrades.beacon.getImplementationAddress(greeterBeacon.address);

  const deployedImplAddress = await upgrades.deployImplementation(GreeterV2);

  await upgrades.upgradeBeacon(greeterBeacon, GreeterV2, { useDeployedImplementation: true });
  const newImplAddress = await upgrades.beacon.getImplementationAddress(greeterBeacon.address);
  t.not(newImplAddress, origImplAddress);
  t.is(newImplAddress, deployedImplAddress);
});
