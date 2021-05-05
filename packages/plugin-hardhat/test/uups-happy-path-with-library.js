const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Adder = await ethers.getContractFactory('AdderProxiable');
  t.context.AdderV2 = await ethers.getContractFactory('AdderV2Proxiable');
});

test('happy path with library', async t => {
  const { Adder, AdderV2 } = t.context;
  const adder = await upgrades.deployProxy(Adder, { kind: 'uups' });
  const adder2 = await upgrades.upgradeProxy(adder, AdderV2);
  await adder2.add(1);
});
