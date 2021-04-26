const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.InitializerOverloaded = await ethers.getContractFactory('InitializerOverloaded');
  t.context.InitializerMissing = await ethers.getContractFactory('InitializerMissing');
});

test('multiple matching functions', async t => {
  const { InitializerOverloaded } = t.context;
  await t.throwsAsync(
    () => upgrades.deployProxy(InitializerOverloaded, [42], { kind: 'transparent' }),
    undefined,
    'multiple matching functions',
  );
});

test('unique function selector', async t => {
  const { InitializerOverloaded } = t.context;
  const instance = await upgrades.deployProxy(InitializerOverloaded, [42], {
    kind: 'transparent',
    initializer: 'initialize(uint256)',
  });
  t.is((await instance.x()).toString(), '42');
});

test('no initialize function and no args', async t => {
  const { InitializerMissing } = t.context;
  await upgrades.deployProxy(InitializerMissing, { kind: 'transparent' });
});

test('no initialize function and explicit args', async t => {
  const { InitializerMissing } = t.context;
  await t.throwsAsync(
    () => upgrades.deployProxy(InitializerMissing, [42], { kind: 'transparent' }),
    undefined,
    'no matching function',
  );
});
