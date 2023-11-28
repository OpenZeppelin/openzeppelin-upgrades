const test = require('ava');
const sinon = require('sinon');

const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

const TransparentUpgradableProxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json');

test.before(async t => {
  t.context.GreeterTransparent40Fallback = await ethers.getContractFactory('GreeterTransparent40Fallback');
  t.context.GreeterTransparent40FallbackV2 = await ethers.getContractFactory('GreeterTransparent40FallbackV2');
  t.context.UnsafeAdminFallback = await ethers.getContractFactory('UnsafeAdminFallback');

  t.context.GreeterTransparent40FallbackString = await ethers.getContractFactory('GreeterTransparent40FallbackString');
  t.context.GreeterTransparent40FallbackStringV2 = await ethers.getContractFactory(
    'GreeterTransparent40FallbackStringV2',
  );
  t.context.UnsafeAdminFallbackString = await ethers.getContractFactory('UnsafeAdminFallbackString');

  t.context.TransparentUpgradableProxy = await ethers.getContractFactory(
    TransparentUpgradableProxy.abi,
    TransparentUpgradableProxy.bytecode,
  );
});

function getInitializerData(contractInterface, args) {
  return contractInterface.encodeFunctionData('initialize', args);
}

test('admin with unknown upgrades interface version due to fallback returning non-string', async t => {
  const {
    GreeterTransparent40Fallback,
    GreeterTransparent40FallbackV2,
    UnsafeAdminFallback,
    TransparentUpgradableProxy,
  } = t.context;

  const impl = await GreeterTransparent40Fallback.deploy();
  await impl.waitForDeployment();
  const admin = await UnsafeAdminFallback.deploy();
  await admin.waitForDeployment();
  const proxy = await TransparentUpgradableProxy.deploy(
    await impl.getAddress(),
    await admin.getAddress(),
    getInitializerData(GreeterTransparent40Fallback.interface, ['Hello, Hardhat!']),
  );
  await proxy.waitForDeployment();

  const greeter = GreeterTransparent40Fallback.attach(await proxy.getAddress());
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  await upgrades.forceImport(await proxy.getAddress(), GreeterTransparent40Fallback);

  const debugStub = sinon.stub();
  const upgradeProxy = require('../dist/upgrade-proxy').makeUpgradeProxy(hre, false, debugStub);

  const greeter2 = await upgradeProxy(proxy, GreeterTransparent40FallbackV2);
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');

  t.true(
    debugStub.calledWith(
      `Unexpected type for UPGRADE_INTERFACE_VERSION at address ${await admin.getAddress()}. Expected a string`,
    ),
  );
});

test('admin with unknown upgrades interface version due to fallback returning string', async t => {
  const {
    GreeterTransparent40FallbackString,
    GreeterTransparent40FallbackStringV2,
    UnsafeAdminFallbackString,
    TransparentUpgradableProxy,
  } = t.context;

  const impl = await GreeterTransparent40FallbackString.deploy();
  await impl.waitForDeployment();
  const admin = await UnsafeAdminFallbackString.deploy();
  await admin.waitForDeployment();
  const proxy = await TransparentUpgradableProxy.deploy(
    await impl.getAddress(),
    await admin.getAddress(),
    getInitializerData(GreeterTransparent40FallbackString.interface, ['Hello, Hardhat!']),
  );
  await proxy.waitForDeployment();

  const greeter = GreeterTransparent40FallbackString.attach(await proxy.getAddress());
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  await upgrades.forceImport(await proxy.getAddress(), GreeterTransparent40FallbackString);

  const debugStub = sinon.stub();
  const upgradeProxy = require('../dist/upgrade-proxy').makeUpgradeProxy(hre, false, debugStub);

  const greeter2 = await upgradeProxy(proxy, GreeterTransparent40FallbackStringV2);
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');

  t.true(
    debugStub.calledWith(
      `Unknown UPGRADE_INTERFACE_VERSION foo for proxy admin at ${await admin.getAddress()}. Expected 5.0.0`,
    ),
  );
});
