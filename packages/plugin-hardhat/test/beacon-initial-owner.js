const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
});

test('initial owner using default signer', async t => {
  const { Greeter } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  const beaconOwner = await beacon.owner();

  const defaultSigner = await ethers.provider.getSigner(0);

  t.is(beaconOwner, defaultSigner.address);
});

test('initial owner using custom signer', async t => {
  const customSigner = await ethers.provider.getSigner(1);

  const Greeter = await ethers.getContractFactory('Greeter', customSigner);

  const beacon = await upgrades.deployBeacon(Greeter);
  const beaconOwner = await beacon.owner();

  t.is(beaconOwner, customSigner.address);
});

test('initial owner using initialOwner option', async t => {
  const { Greeter } = t.context;

  const initialOwner = await ethers.provider.getSigner(2);

  const beacon = await upgrades.deployBeacon(Greeter, { initialOwner: initialOwner.address });
  const beaconOwner = await beacon.owner();

  t.is(beaconOwner, initialOwner.address);
});

test('initial owner - no signer in ContractFactory', async t => {
  const defaultProvider = ethers.getDefaultProvider();

  const Greeter = await ethers.getContractFactory('Greeter', defaultProvider);

  await t.throwsAsync(upgrades.deployBeacon(Greeter), {
    message: /Initial owner must be specified/,
  });

  const initialOwner = await ethers.provider.getSigner(2);

  const beacon = await upgrades.deployBeacon(Greeter, { initialOwner: initialOwner.address });
  const beaconOwner = await beacon.owner();

  t.is(beaconOwner, initialOwner.address);
});
