const test = require('ava');

const { platform } = require('hardhat');

test('creates platform object in hardhat runtime', async t => {
  t.is(typeof platform.proposeUpgrade, 'function');
});
