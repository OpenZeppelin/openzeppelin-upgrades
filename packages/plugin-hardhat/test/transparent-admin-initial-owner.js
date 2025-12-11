/* eslint-disable */
// This file uses import attributes (import ... with { type: 'json' })
// which is valid ES2025 syntax but ESLint parser doesn't support it yet
import test from 'ava';
import hre from 'hardhat';
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';
import ProxyAdmin from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json' with { type: 'json' };

const connection = await hre.network.connect();
const { ethers } = connection;


/** @type {import('@openzeppelin/hardhat-upgrades').HardhatUpgrades} */
let upgrades;
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
  const admin = await ethers.getContractAt(OWNABLE_ABI, adminAddress); // ← mudou aqui
  const defaultSigner = await ethers.provider.getSigner(0);
  t.is(await admin.owner(), defaultSigner.address);
test('initial owner using custom signer', async t => {
  const customSigner = await ethers.provider.getSigner(1);
  const Greeter = await ethers.getContractFactory('Greeter', customSigner);
  t.is(await admin.owner(), customSigner.address);
test('initial owner using initialOwner option', async t => {
  const initialOwner = await ethers.provider.getSigner(2);
  const proxy = await upgrades.deployProxy(Greeter, ['hello'], { initialOwner: initialOwner.address });
  t.is(await admin.owner(), initialOwner.address);
test('initial owner - no signer in ContractFactory', async t => {
  const defaultProvider = ethers.getDefaultProvider();
  const Greeter = await ethers.getContractFactory('Greeter', defaultProvider);
  await t.throwsAsync(upgrades.deployProxy(Greeter, ['hello']), {
    message: /Initial owner must be specified/,
  });
test('initial owner - must not be ProxyAdmin ', async t => {
  const { Greeter, ProxyAdmin } = t.context;
  const proxyAdmin = await ProxyAdmin.deploy(defaultSigner.address);
  const predeployedProxyAdminAddress = await proxyAdmin.getAddress();
  const e = await t.throwsAsync(() =>
    upgrades.deployProxy(Greeter, ['hello'], { initialOwner: predeployedProxyAdminAddress }),
  );
  t.true(e.message.includes('`initialOwner` must not be a ProxyAdmin contract.'), e.message);
  t.true(e.message.includes(predeployedProxyAdminAddress), e.message);
test('initial owner - must not be ownable', async t => {
  const { Greeter, HasOwner } = t.context;
  const hasOwner = await HasOwner.deploy(defaultSigner.address); // not actually a proxy admin, but it looks like one because it has an owner
  const predeployedOwnableAddress = await hasOwner.getAddress();
    upgrades.deployProxy(Greeter, ['hello'], { initialOwner: predeployedOwnableAddress }),
  t.true(e.message.includes(predeployedOwnableAddress), e.message);
test('initial owner - skip ProxyAdmin check', async t => {
  const hasOwner = await HasOwner.deploy(defaultSigner.address);
  await upgrades.deployProxy(Greeter, ['hello'], {
    initialOwner: predeployedOwnableAddress,
    unsafeSkipProxyAdminCheck: true,
