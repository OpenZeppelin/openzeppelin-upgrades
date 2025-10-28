import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;


test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.GapV1 = await ethers.getContractFactory('GapV1');
  t.context.GapV2 = await ethers.getContractFactory('GapV2');
  t.context.GapV2_Bad = await ethers.getContractFactory('GapV2_Bad');
});

test('use gap correctly with solidity config overrides', async t => {
  const { GapV1, GapV2 } = t.context;
  const proxy = await upgrades.deployProxy(GapV1);
  await upgrades.upgradeProxy(proxy, GapV2);
});

test('use gap incorrectly', async t => {
  const { GapV1, GapV2_Bad } = t.context;
  const proxy = await upgrades.deployProxy(GapV1);
  await t.throwsAsync(() => upgrades.upgradeProxy(proxy, GapV2_Bad), undefined, 'Set __gap array to size 47');
});
