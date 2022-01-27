const test = require('ava');

const { ethers, upgrades, network } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
});

test.beforeEach(async () => {
  // reset network before each test to avoid finding a previously deployed impl
  await network.provider.request({
    method: 'hardhat_reset',
    params: [],
  });
  await network.provider.send('evm_setAutomine', [false]);
  await network.provider.send('evm_setIntervalMining', [100]);
});

const TIMED_OUT = 'Timed out waiting for transaction';
const USE_OPTIONS =
  'If the problem persists, adjust the polling parameters with the timeout and pollingInterval options.';

test('timeout too low, long polling', async t => {
  const error = await t.throwsAsync(() =>
    upgrades.deployBeacon(t.context.Greeter, { timeout: 1, pollingInterval: 200 }),
  );
  t.true(error.message.includes(TIMED_OUT) && error.message.includes(USE_OPTIONS));
});

test('timeout too low, short polling', async t => {
  const error = await t.throwsAsync(() => upgrades.deployBeacon(t.context.Greeter, { timeout: 1, pollingInterval: 1 }));
  t.true(error.message.includes(TIMED_OUT) && error.message.includes(USE_OPTIONS));
});

test('timeout too low, 0 ms polling', async t => {
  const error = await t.throwsAsync(() => upgrades.deployBeacon(t.context.Greeter, { timeout: 1, pollingInterval: 0 }));
  t.true(error.message.includes(TIMED_OUT) && error.message.includes(USE_OPTIONS));
});

test('good timeout, long polling', async t => {
  await upgrades.deployBeacon(t.context.Greeter, { timeout: 1000, pollingInterval: 200 });
});

test('good timeout, short polling', async t => {
  await upgrades.deployBeacon(t.context.Greeter, { timeout: 1000, pollingInterval: 10 });
});

test('infinite timeout, long polling', async t => {
  await upgrades.deployBeacon(t.context.Greeter, { timeout: 0, pollingInterval: 200 });
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

test('upgrade', async t => {
  // automine to immediately deploy a new proxy to use in below tests
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
  t.true(error.message.includes(TIMED_OUT) && error.message.includes(USE_OPTIONS));

  // upgrade: infinite timeout
  await upgrades.upgradeBeacon(beacon, t.context.GreeterV2, { timeout: 0, pollingInterval: 10 });
});
