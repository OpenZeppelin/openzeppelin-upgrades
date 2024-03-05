const test = require('ava');

const { ethers, upgrades, network } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterV2Proxiable = await ethers.getContractFactory('GreeterV2Proxiable');
});

test.beforeEach(async t => {
  // reset network before each test to avoid finding a previously deployed impl
  await network.provider.request({
    method: 'hardhat_reset',
    params: [],
  });

  // enable interval mining for timeout tests
  t.context.automine = await network.provider.send('hardhat_getAutomine');
  await network.provider.send('evm_setAutomine', [false]);
  await network.provider.send('evm_setIntervalMining', [500]);
});

test.afterEach(async t => {
  // reset network state after each test, otherwise ava tests may hang due to interval mining
  await network.provider.send('evm_setAutomine', [t.context.automine]);
  await network.provider.request({
    method: 'hardhat_reset',
    params: [],
  });
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
  // manual mining
  await network.provider.send('evm_setIntervalMining', [0]);

  const error = await t.throwsAsync(() =>
    upgrades.deployProxy(t.context.Greeter, ['Hello, Hardhat!'], {
      kind: 'transparent',
      timeout: 1,
      pollingInterval: 0,
    }),
  );
  t.true(error.message.includes(TIMED_OUT_IMPL) && error.message.includes(USE_OPTIONS), error.message);

  // mine the impl deployment
  await network.provider.send('evm_mine');

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
  // automine to immediately deploy a new beacon to use in below tests
  await network.provider.send('evm_setAutomine', [true]);
  const beacon = await upgrades.deployBeacon(t.context.Greeter, {
    timeout: 0,
    pollingInterval: 0,
  });
  await network.provider.send('evm_setAutomine', [false]);

  // upgrade: timeout too low
  const error = await t.throwsAsync(() =>
    upgrades.upgradeBeacon(beacon, t.context.GreeterV2, { timeout: 1, pollingInterval: 1 }),
  );
  t.true(error.message.includes(TIMED_OUT_IMPL) && error.message.includes(USE_OPTIONS), error.message);

  // upgrade: infinite timeout
  await upgrades.upgradeBeacon(beacon, t.context.GreeterV2, { timeout: 0, pollingInterval: 10 });
});

test('upgrade proxy', async t => {
  // automine to immediately deploy a new proxy to use in below tests
  await network.provider.send('evm_setAutomine', [true]);
  const proxy = await upgrades.deployProxy(t.context.GreeterProxiable, ['Hello, Hardhat!'], {
    kind: 'uups',
    timeout: 0,
    pollingInterval: 0,
  });
  await network.provider.send('evm_setAutomine', [false]);

  // upgrade: timeout too low
  const error = await t.throwsAsync(() =>
    upgrades.upgradeProxy(proxy, t.context.GreeterV2Proxiable, { timeout: 1, pollingInterval: 1 }),
  );
  t.true(error.message.includes(TIMED_OUT_IMPL) && error.message.includes(USE_OPTIONS), error.message);

  // upgrade: infinite timeout
  await upgrades.upgradeProxy(proxy, t.context.GreeterV2Proxiable, { timeout: 0, pollingInterval: 10 });
});
