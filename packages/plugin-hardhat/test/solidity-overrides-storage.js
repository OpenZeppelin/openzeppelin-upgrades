const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.GapV1 = await ethers.getContractFactory('GapV1');
  t.context.GapV2 = await ethers.getContractFactory('GapV2');
});

test('use gap correctly with solidity config overrides', async t => {
  const { GapV1, GapV2 } = t.context;
  const proxy = await upgrades.deployProxy(GapV1);
  await upgrades.upgradeProxy(proxy, GapV2);
});
