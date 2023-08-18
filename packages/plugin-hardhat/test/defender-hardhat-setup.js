const test = require('ava');

const { defender } = require('hardhat');

test('creates defender object in hardhat runtime', async t => {
  t.is(typeof defender.proposeUpgradeWithApproval, 'function');
});
