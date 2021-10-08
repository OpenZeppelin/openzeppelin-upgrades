const test = require('ava');

const { upgrades } = require('hardhat');

test('start with empty network manifest', async t => {
  await t.throwsAsync(upgrades.admin.getInstance(), undefined, 'No ProxyAdmin was found in the network manifest');
});
