const test = require('ava');

const { defender, config } = require('hardhat');

test('creates defender object in hardhat runtime', async t => {
  t.is(typeof defender.proposeUpgrade, 'function');
});

test('extends hardhat config with defender settings', async t => {
  t.deepEqual(config.defender, { apiKey: 'KEY', apiSecret: 'SECRET' });
});
