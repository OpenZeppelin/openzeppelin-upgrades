import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  
  t.context.Invalid = await ethers.getContractFactory('Invalid');
});

test('invalid deployment', async t => {
  const { Invalid } = t.context;
  await t.throwsAsync(() => upgrades.deployBeacon(Invalid), undefined, 'Contract `Invalid` is not upgrade safe');
});
