const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Adder = await ethers.getContractFactory('Adder');
  t.context.AdderV2 = await ethers.getContractFactory('AdderV2');
});

test('happy path with library', async t => {
  const { Adder, AdderV2 } = t.context;

  const beacon = await upgrades.deployBeacon(Adder); 
  const adder = await upgrades.deployBeaconProxy(beacon, Adder);

  await upgrades.upgradeBeacon(beacon, AdderV2);  
  const adder2 = await upgrades.reloadBeaconProxy(adder);
  await adder2.add(1);
});
