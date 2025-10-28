import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;

const hre = require('hardhat');

const ProxyAdmin = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json');

const OWNABLE_ABI = ['function owner() view returns (address)'];

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.HasOwner = await ethers.getContractFactory('HasOwner');
  t.context.ProxyAdmin = await ethers.getContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode);
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

test('initial owner - must not be ProxyAdmin ', async t => {
  const { Greeter, ProxyAdmin } = t.context;

  const defaultSigner = await ethers.provider.getSigner(0);
  const proxyAdmin = await ProxyAdmin.deploy(defaultSigner.address);
  const predeployedProxyAdminAddress = await proxyAdmin.getAddress();

  const e = await t.throwsAsync(() =>
    upgrades.deployProxy(Greeter, ['hello'], { initialOwner: predeployedProxyAdminAddress }),
  );
  t.true(e.message.includes('`initialOwner` must not be a ProxyAdmin contract.'), e.message);
  t.true(e.message.includes(predeployedProxyAdminAddress), e.message);
});

test('initial owner - must not be ownable', async t => {
  const { Greeter, HasOwner } = t.context;

  const defaultSigner = await ethers.provider.getSigner(0);
  const hasOwner = await HasOwner.deploy(defaultSigner.address); // not actually a proxy admin, but it looks like one because it has an owner
  const predeployedOwnableAddress = await hasOwner.getAddress();

  const e = await t.throwsAsync(() =>
    upgrades.deployProxy(Greeter, ['hello'], { initialOwner: predeployedOwnableAddress }),
  );
  t.true(e.message.includes('`initialOwner` must not be a ProxyAdmin contract.'), e.message);
  t.true(e.message.includes(predeployedOwnableAddress), e.message);
});

test('initial owner - skip ProxyAdmin check', async t => {
  const { Greeter, HasOwner } = t.context;

  const defaultSigner = await ethers.provider.getSigner(0);
  const hasOwner = await HasOwner.deploy(defaultSigner.address);
  const predeployedOwnableAddress = await hasOwner.getAddress();

  await upgrades.deployProxy(Greeter, ['hello'], {
    initialOwner: predeployedOwnableAddress,
    unsafeSkipProxyAdminCheck: true,
  });
});
