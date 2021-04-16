const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Invalid = await ethers.getContractFactory('Invalid');
});

test('invalid deployment', async t => {
  const { Invalid } = t.context;
  await t.throwsAsync(
    () => upgrades.deployProxy(Invalid, { kind: 'transparent' }),
    undefined,
    'Contract `Invalid` is not upgrade safe',
  );
});
