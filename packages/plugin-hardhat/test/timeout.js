import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.GreeterProxiable = await ethers.getContractFactory('contracts/GreeterProxiable.sol:GreeterProxiable');
  t.context.GreeterV2Proxiable = await ethers.getContractFactory('contracts/GreeterV2Proxiable.sol:GreeterV2Proxiable');
});

test.beforeEach(async t => {
  // Use ethers.provider from connection
  const provider = ethers.provider;
  
  // In Hardhat 3, we need to reset using the network manager
  // or simply create a new snapshot and restore it
  const snapshotId = await provider.send('evm_snapshot', []);
  t.context.snapshotId = snapshotId;

  // enable interval mining for timeout tests
  t.context.automine = await provider.send('hardhat_getAutomine', []);
  await provider.send('evm_setAutomine', [false]);
  await provider.send('evm_setIntervalMining', [500]);
  
  // Store provider in context for use in tests
  t.context.provider = provider;
});

test.afterEach(async t => {
  const provider = t.context.provider;
  // reset network state after each test
  await provider.send('evm_setAutomine', [t.context.automine]);
  
  // Revert to snapshot instead of hardhat_reset
  await provider.send('evm_revert', [t.context.snapshotId]);
});

const TIMED_OUT_IMPL = 'Timed out waiting for implementation contract deployment';
const USE_OPTIONS =
  'If the problem persists, adjust the polling parameters with the timeout and pollingInterval options.';

test('timeout too low - beacon', async t => {
  const error = await t.throwsAsync(() =>
    upgrades.deployBeacon(t.context.Greeter, { timeout: 1, pollingInterval: 1000 }),
  );
  t.true(error.message.includes(TIMED_OUT_IMPL) && error.message.includes(USE_OPTIONS), error.message);
});

test('timeout too low - proxy impl', async t => {
  const provider = t.context.provider;
  // manual mining
  await provider.send('evm_setIntervalMining', [0]);

  const error = await t.throwsAsync(() =>
    upgrades.deployProxy(t.context.Greeter, ['Hello, Hardhat!'], {
      kind: 'transparent',
      timeout: 1,
      pollingInterval: 0,
    }),
  );
  t.true(error.message.includes(TIMED_OUT_IMPL) && error.message.includes(USE_OPTIONS), error.message);

  // mine the impl deployment
  await provider.send('evm_mine', []);

  // run again to continue with proxy deployment
  await upgrades.deployProxy(t.context.Greeter, ['Hello, Hardhat!'], {
    kind: 'transparent',
    timeout: 1,
    pollingInterval: 0,
  });
});

test('good timeout - beacon', async t => {
  await upgrades.deployBeacon(t.context.Greeter, {
    timeout: 2000,
    pollingInterval: 1000,
  });
});

test('good timeout - proxy', async t => {
  await upgrades.deployProxy(t.context.Greeter, ['Hello, Hardhat!'], {
    kind: 'transparent',
    timeout: 2000,
    pollingInterval: 10,
  });
});

test('infinite timeout, long polling', async t => {
  await upgrades.deployBeacon(t.context.Greeter, { timeout: 0, pollingInterval: 1000 });
});

test('infinite timeout, short polling', async t => {
  await upgrades.deployBeacon(t.context.Greeter, { timeout: 0, pollingInterval: 10 });
});

test('infinite timeout, 0 ms polling', async t => {
  await upgrades.deployBeacon(t.context.Greeter, { timeout: 0, pollingInterval: 0 });
});

test('single option', async t => {
  await upgrades.deployBeacon(t.context.Greeter, { pollingInterval: 0 });
});

test('upgrade beacon', async t => {
  const provider = t.context.provider;
  // automine to immediately deploy a new beacon to use in below tests
  await provider.send('evm_setAutomine', [true]);
  const beacon = await upgrades.deployBeacon(t.context.Greeter, {
    timeout: 0,
    pollingInterval: 0,
  });
  await provider.send('evm_setAutomine', [false]);

  // upgrade: timeout too low
  const error = await t.throwsAsync(() =>
    upgrades.upgradeBeacon(beacon, t.context.GreeterV2, { timeout: 1, pollingInterval: 1 }),
  );
  t.true(error.message.includes(TIMED_OUT_IMPL) && error.message.includes(USE_OPTIONS), error.message);

  // upgrade: infinite timeout
  await upgrades.upgradeBeacon(beacon, t.context.GreeterV2, { timeout: 0, pollingInterval: 10 });
});

test('upgrade proxy', async t => {
  const provider = t.context.provider;
  // automine to immediately deploy a new proxy to use in below tests
  await provider.send('evm_setAutomine', [true]);
  const signer = await ethers.provider.getSigner();
  const proxy = await upgrades.deployProxy(t.context.GreeterProxiable, [await signer.getAddress(), 'Hello, Hardhat!'], {
    kind: 'uups',
    timeout: 0,
    pollingInterval: 0,
  });
  await provider.send('evm_setAutomine', [false]);

  // upgrade: timeout too low
  const error = await t.throwsAsync(() =>
    upgrades.upgradeProxy(proxy, t.context.GreeterV2Proxiable, { timeout: 1, pollingInterval: 1 }),
  );
  t.true(error.message.includes(TIMED_OUT_IMPL) && error.message.includes(USE_OPTIONS), error.message);

  // upgrade: infinite timeout
  await upgrades.upgradeProxy(proxy, t.context.GreeterV2Proxiable, { timeout: 0, pollingInterval: 10 });
});