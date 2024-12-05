const test = require('ava');

const { ethers, upgrades } = require('hardhat');
const { deploy } = require('../dist/utils/deploy');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3');
  t.context.CustomBeaconProxy = await ethers.getContractFactory('CustomBeaconProxy');
  const [deployer, anon] = await ethers.getSigners();
  t.context.deployer = deployer;
  t.context.anon = anon;
});

async function deployWithExtraProxyArgs(hre, opts, factory, ...args) {
  const allArgs = [...args, ...(opts.proxyExtraConstructorArgs || [])];
  return deploy(hre, opts, factory, ...allArgs);
}

test('custom beacon proxy factory and deploy function', async t => {
  const { Greeter, GreeterV2, GreeterV3, CustomBeaconProxy, deployer, anon } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter);
  const greeterBeaconDeployer = await upgrades.deployBeacon(GreeterV2);
  const greeter = await upgrades.deployBeaconProxy(greeterBeacon, Greeter, ['Hello, Hardhat!'], {
    proxyFactory: CustomBeaconProxy,
    deployFunction: deployWithExtraProxyArgs,
    proxyExtraConstructorArgs: [await greeterBeaconDeployer.getAddress()],
  });
  await greeter.waitForDeployment();
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const greeterAsV2 = GreeterV2.attach(await greeter.getAddress());

  // When calling from anon, uses Greeter as implementation and doesn't have resetGreeting method
  let e = await t.throwsAsync(() => greeterAsV2.connect(anon).resetGreeting());
  t.true(e.message.includes('Transaction reverted: function selector was not recognized'), e.message);

  // When calling from deployer address, uses Greeter as implementation and doesn't have resetGreeting method
  await greeterAsV2.connect(deployer).resetGreeting();

  // For both changes the greet, because even when using different implementations, they share the storage
  t.is(await greeterAsV2.connect(anon).greet(), 'Hello World');
  t.is(await greeterAsV2.connect(deployer).greet(), 'Hello World');

  // Upgrade only the deployer beacon
  await upgrades.upgradeBeacon(greeterBeaconDeployer, GreeterV3);

  const greeterAsV3 = GreeterV3.attach(await greeter.getAddress());

  // When calling from anon, still uses Greeter as implementation and doesn't have version() method
  e = await t.throwsAsync(() => greeterAsV3.connect(anon).version());
  t.true(e.message.includes('Transaction reverted: function selector was not recognized'), e.message);
  t.is(await greeterAsV3.connect(deployer).version(), 'V3');
});
