const test = require('ava');

const { ethers, upgrades } = require('hardhat');

upgrades.silenceWarnings();

test.before(async t => {
  t.context.Action = await ethers.getContractFactory('ActionProxiable');
  t.context.ActionV2 = await ethers.getContractFactory('ActionV2Proxiable');
  t.context.ActionV2Bad = await ethers.getContractFactory('ActionV2BadProxiable');
});

test('deployProxy', async t => {
  const { Action } = t.context;
  await upgrades.deployProxy(Action, [], { kind: 'uups' });
});

test('upgradeProxy', async t => {
  const { Action, ActionV2 } = t.context;
  const action = await upgrades.deployProxy(Action, [], { kind: 'uups' });
  await upgrades.upgradeProxy(action, ActionV2);
});

test('upgradeProxy with incompatible layout', async t => {
  const { Action, ActionV2Bad } = t.context;
  const action = await upgrades.deployProxy(Action, [], { kind: 'uups' });
  const error = await t.throwsAsync(() => upgrades.upgradeProxy(action, ActionV2Bad));
  t.true(error.message.includes('Upgraded `action` to an incompatible type'));
});
