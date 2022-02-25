const test = require('ava');

const { ethers, upgrades } = require('hardhat');

const ProxyAdmin = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json');
const TransparentUpgradableProxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json');

const ERC1967Proxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json');

const BeaconProxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol/BeaconProxy.json');
const UpgradableBeacon = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3');
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterV2Proxiable = await ethers.getContractFactory('GreeterV2Proxiable');
  t.context.GreeterV3Proxiable = await ethers.getContractFactory('GreeterV3Proxiable');
  t.context.CustomProxy = await ethers.getContractFactory('CustomProxy');

  t.context.ProxyAdmin = await ethers.getContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode);
  t.context.TransparentUpgradableProxy = await ethers.getContractFactory(
    TransparentUpgradableProxy.abi,
    TransparentUpgradableProxy.bytecode,
  );

  t.context.ERC1967Proxy = await ethers.getContractFactory(ERC1967Proxy.abi, ERC1967Proxy.bytecode);

  t.context.BeaconProxy = await ethers.getContractFactory(BeaconProxy.abi, BeaconProxy.bytecode);
  t.context.UpgradableBeacon = await ethers.getContractFactory(UpgradableBeacon.abi, UpgradableBeacon.bytecode);
});

function getInitializerData(contractInterface, args) {
  const initializer = 'initialize';
  const fragment = contractInterface.getFunction(initializer);
  return contractInterface.encodeFunctionData(fragment, args);
}

const NOT_REGISTERED_ADMIN = 'Proxy admin is not the one registered in the network manifest';
const NOT_SUPPORTED_FUNCTION = 'Beacon proxies are not supported with the current function';
const NOT_SUPPORTED_PROXY_OR_BEACON = /Contract at address \S+ doesn't look like a supported proxy or beacon/;
const ONLY_PROXY_OR_BEACON =
  'Only transparent, UUPS, or beacon proxies or beacons can be used with the forceImport() function.';

test('transparent happy path', async t => {
  const { Greeter, GreeterV2, ProxyAdmin, TransparentUpgradableProxy } = t.context;

  const impl = await Greeter.deploy();
  await impl.deployed();
  const admin = await ProxyAdmin.deploy();
  await admin.deployed();
  const proxy = await TransparentUpgradableProxy.deploy(
    impl.address,
    admin.address,
    getInitializerData(Greeter.interface, ['Hello, Hardhat!']),
  );
  await proxy.deployed();

  const greeter = await upgrades.forceImport(proxy.address, Greeter);
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const greeter2 = await upgrades.upgradeProxy(greeter, GreeterV2);
  await greeter2.deployed();
  t.is(await greeter2.greet(), 'Hello, Hardhat!');
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');
});

test('uups happy path', async t => {
  const { GreeterProxiable, GreeterV2Proxiable, ERC1967Proxy } = t.context;

  const impl = await GreeterProxiable.deploy();
  await impl.deployed();
  const proxy = await ERC1967Proxy.deploy(
    impl.address,
    getInitializerData(GreeterProxiable.interface, ['Hello, Hardhat!']),
  );
  await proxy.deployed();

  const greeter = await upgrades.forceImport(proxy.address, GreeterProxiable);
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const greeter2 = await upgrades.upgradeProxy(greeter, GreeterV2Proxiable);
  await greeter2.deployed();
  t.is(await greeter2.greet(), 'Hello, Hardhat!');
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');
});

test('beacon proxy happy path', async t => {
  const { Greeter, GreeterV2, UpgradableBeacon, BeaconProxy } = t.context;

  const impl = await Greeter.deploy();
  await impl.deployed();
  const beacon = await UpgradableBeacon.deploy(impl.address);
  await beacon.deployed();
  const proxy = await BeaconProxy.deploy(beacon.address, getInitializerData(Greeter.interface, ['Hello, Hardhat!']));
  await proxy.deployed();

  const greeter = await upgrades.forceImport(proxy.address, Greeter);
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  await upgrades.upgradeBeacon(beacon, GreeterV2);
  const greeter2 = GreeterV2.attach(greeter.address);
  await greeter2.deployed();
  t.is(await greeter2.greet(), 'Hello, Hardhat!');
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');
});

test('beacon happy path', async t => {
  const { Greeter, GreeterV2, UpgradableBeacon } = t.context;

  const impl = await Greeter.deploy();
  await impl.deployed();
  const beacon = await UpgradableBeacon.deploy(impl.address);
  await beacon.deployed();

  const beaconImported = await upgrades.forceImport(beacon.address, Greeter);
  t.is(await beaconImported.implementation(), impl.address);

  await upgrades.upgradeBeacon(beacon, GreeterV2);
});

test('not proxy or beacon', async t => {
  const { Greeter } = t.context;

  const impl = await Greeter.deploy();
  await impl.deployed();

  const e = await t.throwsAsync(() => upgrades.forceImport(impl.address, Greeter));
  t.true(NOT_SUPPORTED_PROXY_OR_BEACON.test(e.message) && e.message.includes(ONLY_PROXY_OR_BEACON), e.message);
});

test('import proxy using contract instance', async t => {
  const { GreeterProxiable, GreeterV2Proxiable, ERC1967Proxy } = t.context;

  const impl = await GreeterProxiable.deploy();
  await impl.deployed();
  const proxy = await ERC1967Proxy.deploy(
    impl.address,
    getInitializerData(GreeterProxiable.interface, ['Hello, Hardhat!']),
  );
  await proxy.deployed();

  const greeter = await upgrades.forceImport(proxy, GreeterProxiable);
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const greeter2 = await upgrades.upgradeProxy(greeter, GreeterV2Proxiable);
  await greeter2.deployed();
  t.is(await greeter2.greet(), 'Hello, Hardhat!');
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');
});

test('ignore kind', async t => {
  const { Greeter, GreeterV2, UpgradableBeacon, BeaconProxy } = t.context;

  const impl = await Greeter.deploy();
  await impl.deployed();
  const beacon = await UpgradableBeacon.deploy(impl.address);
  await beacon.deployed();
  const proxy = await BeaconProxy.deploy(beacon.address, getInitializerData(Greeter.interface, ['Hello, Hardhat!']));
  await proxy.deployed();

  // specify uups, but import should detect that it is a beacon proxy
  const greeter = await upgrades.forceImport(proxy.address, Greeter, { kind: 'uups' });

  // check that it is indeed imported as beacon proxy by trying to upgrade it directly
  const e = await t.throwsAsync(() => upgrades.upgradeProxy(greeter, GreeterV2));
  t.true(e.message.startsWith(NOT_SUPPORTED_FUNCTION), e.message);
});

test('import custom proxy', async t => {
  const { GreeterProxiable, GreeterV2Proxiable, CustomProxy } = t.context;

  const impl = await GreeterProxiable.deploy();
  await impl.deployed();
  const proxy = await CustomProxy.deploy(
    impl.address,
    getInitializerData(GreeterProxiable.interface, ['Hello, Hardhat!']),
  );
  await proxy.deployed();

  const greeter = await upgrades.forceImport(proxy.address, GreeterProxiable);
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  await upgrades.upgradeProxy(greeter, GreeterV2Proxiable);
});

test('wrong implementation', async t => {
  const { Greeter, GreeterV2, ProxyAdmin, TransparentUpgradableProxy } = t.context;

  const impl = await Greeter.deploy();
  await impl.deployed();
  const admin = await ProxyAdmin.deploy();
  await admin.deployed();
  const proxy = await TransparentUpgradableProxy.deploy(
    impl.address,
    admin.address,
    getInitializerData(Greeter.interface, ['Hello, Hardhat!']),
  );
  await proxy.deployed();

  const greeter = await upgrades.forceImport(proxy.address, GreeterV2);
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  // since this is the wrong impl, expect it to have an error if using a non-existent function
  const e = await t.throwsAsync(() => greeter.resetGreeting());
  t.true(e.message.includes('Transaction reverted'), e.message);
});

test('multiple identical implementations', async t => {
  const { GreeterProxiable, GreeterV2Proxiable, ERC1967Proxy } = t.context;

  const impl = await GreeterProxiable.deploy();
  await impl.deployed();
  const proxy = await ERC1967Proxy.deploy(
    impl.address,
    getInitializerData(GreeterProxiable.interface, ['Hello, Hardhat!']),
  );
  await proxy.deployed();

  const impl2 = await GreeterProxiable.deploy();
  await impl2.deployed();
  const proxy2 = await ERC1967Proxy.deploy(
    impl2.address,
    getInitializerData(GreeterProxiable.interface, ['Hello, Hardhat 2!']),
  );
  await proxy2.deployed();

  const greeter = await upgrades.forceImport(proxy.address, GreeterProxiable);
  const greeterUpgraded = await upgrades.upgradeProxy(greeter, GreeterV2Proxiable);
  t.is(await greeterUpgraded.greet(), 'Hello, Hardhat!');

  const greeter2 = await upgrades.forceImport(proxy2.address, GreeterProxiable);
  const greeter2Upgraded = await upgrades.upgradeProxy(greeter2, GreeterV2Proxiable);
  t.is(await greeter2Upgraded.greet(), 'Hello, Hardhat 2!');
});

test('same implementation', async t => {
  const { GreeterProxiable, ERC1967Proxy } = t.context;

  const impl = await GreeterProxiable.deploy();
  await impl.deployed();
  const proxy = await ERC1967Proxy.deploy(
    impl.address,
    getInitializerData(GreeterProxiable.interface, ['Hello, Hardhat!']),
  );
  await proxy.deployed();
  const proxy2 = await ERC1967Proxy.deploy(
    impl.address,
    getInitializerData(GreeterProxiable.interface, ['Hello, Hardhat 2!']),
  );
  await proxy2.deployed();

  const greeter = await upgrades.forceImport(proxy.address, GreeterProxiable);
  const greeter2 = await upgrades.forceImport(proxy2.address, GreeterProxiable);

  const implAddr1 = await upgrades.erc1967.getImplementationAddress(greeter.address);
  const implAddr2 = await upgrades.erc1967.getImplementationAddress(greeter2.address);
  t.is(implAddr2, implAddr1);
});

test('import transparents with different admin', async t => {
  const { Greeter, GreeterV2, ProxyAdmin, TransparentUpgradableProxy } = t.context;

  const impl = await Greeter.deploy();
  await impl.deployed();
  const admin = await ProxyAdmin.deploy();
  await admin.deployed();
  const proxy = await TransparentUpgradableProxy.deploy(
    impl.address,
    admin.address,
    getInitializerData(Greeter.interface, ['Hello, Hardhat!']),
  );
  await proxy.deployed();

  const admin2 = await ProxyAdmin.deploy();
  await admin2.deployed();
  const proxy2 = await TransparentUpgradableProxy.deploy(
    impl.address,
    admin2.address,
    getInitializerData(Greeter.interface, ['Hello, Hardhat 2!']),
  );
  await proxy2.deployed();

  const greeter = await upgrades.forceImport(proxy.address, Greeter);
  const greeter2 = await upgrades.forceImport(proxy2.address, Greeter);

  t.not(
    await upgrades.erc1967.getAdminAddress(greeter2.address),
    await upgrades.erc1967.getAdminAddress(greeter.address),
  );

  // cannot upgrade directly
  const e = await t.throwsAsync(() => upgrades.upgradeProxy(proxy.address, GreeterV2));
  t.is(NOT_REGISTERED_ADMIN, e.message, e.message);

  // prepare upgrades instead
  const greeterV2ImplAddr = await upgrades.prepareUpgrade(greeter.address, GreeterV2);
  const greeterV2ImplAddr_2 = await upgrades.prepareUpgrade(greeter2.address, GreeterV2);

  t.is(greeterV2ImplAddr_2, greeterV2ImplAddr);
});
