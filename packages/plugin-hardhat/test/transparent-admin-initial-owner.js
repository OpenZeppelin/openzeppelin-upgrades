const test = require('ava');

const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

const OWNABLE_ABI = ['function owner() view returns (address)'];

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
});

test('initial owner using default signer', async t => {
  const { Greeter } = t.context;

  const proxy = await upgrades.deployProxy(Greeter, ['hello']);
  const adminAddress = await upgrades.erc1967.getAdminAddress(await proxy.getAddress());
  const admin = await hre.ethers.getContractAt(OWNABLE_ABI, adminAddress);

  const defaultSigner = await ethers.provider.getSigner(0);

  t.is(await admin.owner(), defaultSigner.address);
});

test('initial owner using custom signer', async t => {
  const customSigner = await ethers.provider.getSigner(1);

  const Greeter = await ethers.getContractFactory('Greeter', customSigner);

  const proxy = await upgrades.deployProxy(Greeter, ['hello']);
  const adminAddress = await upgrades.erc1967.getAdminAddress(await proxy.getAddress());
  const admin = await hre.ethers.getContractAt(OWNABLE_ABI, adminAddress);

  t.is(await admin.owner(), customSigner.address);
});

test('initial owner using initialOwner option', async t => {
  const { Greeter } = t.context;

  const initialOwner = await ethers.provider.getSigner(2);

  const proxy = await upgrades.deployProxy(Greeter, ['hello'], { initialOwner: initialOwner.address });
  const adminAddress = await upgrades.erc1967.getAdminAddress(await proxy.getAddress());
  const admin = await hre.ethers.getContractAt(OWNABLE_ABI, adminAddress);

  t.is(await admin.owner(), initialOwner.address);
});

test('initial owner - no signer in ContractFactory', async t => {
  const defaultProvider = ethers.getDefaultProvider();

  const Greeter = await ethers.getContractFactory('Greeter', defaultProvider);

  await t.throwsAsync(upgrades.deployProxy(Greeter, ['hello']), {
    message: /Initial owner must be specified/,
  });

  const initialOwner = await ethers.provider.getSigner(2);

  const proxy = await upgrades.deployProxy(Greeter, ['hello'], { initialOwner: initialOwner.address });
  const adminAddress = await upgrades.erc1967.getAdminAddress(await proxy.getAddress());
  const admin = await hre.ethers.getContractAt(OWNABLE_ABI, adminAddress);

  t.is(await admin.owner(), initialOwner.address);
});
