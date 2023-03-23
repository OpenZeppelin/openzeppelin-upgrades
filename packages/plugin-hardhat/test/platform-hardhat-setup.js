const test = require('ava');

const { platform, config } = require('hardhat');

test('creates platform object in hardhat runtime', async t => {
  t.is(typeof platform.proposeUpgrade, 'function');
});

test('extends hardhat config with platform settings', async t => {
  t.deepEqual(config.platform, { apiKey: 'KEY', apiSecret: 'SECRET' });
});
