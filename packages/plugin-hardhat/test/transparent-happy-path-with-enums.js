import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;



test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  upgrades.silenceWarnings();
  t.context.Action = await ethers.getContractFactory('Action');
  t.context.ActionV2 = await ethers.getContractFactory('ActionV2');
  t.context.ActionV2Bad = await ethers.getContractFactory('ActionV2Bad');
});

test('deployProxy', async t => {
  const { Action } = t.context;
  await upgrades.deployProxy(Action, [], { kind: 'transparent' });
});

test('upgradeProxy', async t => {
  const { Action, ActionV2 } = t.context;
  const action = await upgrades.deployProxy(Action, [], { kind: 'transparent' });
  await upgrades.upgradeProxy(action, ActionV2);
});

test('upgradeProxy with incompatible layout', async t => {
  const { Action, ActionV2Bad } = t.context;
  const action = await upgrades.deployProxy(Action, [], { kind: 'transparent' });
  const error = await t.throwsAsync(() => upgrades.upgradeProxy(action, ActionV2Bad));
  t.true(error.message.includes('Upgraded `action` to an incompatible type'));
});
