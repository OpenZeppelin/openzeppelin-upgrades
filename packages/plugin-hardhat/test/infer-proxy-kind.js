const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
});

test('infer proxy kind', async t => {
  const { Greeter, GreeterProxiable } = t.context;

  const uups = await upgrades.deployProxy(GreeterProxiable, ['Hello, Hardhat!']);
  t.is(await upgrades.erc1967.getAdminAddress(await uups.getAddress()), ethers.ZeroAddress);

  const transparent = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!']);
  t.is(
    await upgrades.erc1967.getAdminAddress(await transparent.getAddress()),
    await (await upgrades.admin.getInstance()).getAddress(),
  );

  const beacon = await upgrades.deployBeacon(Greeter);
  const beaconProxy = await upgrades.deployBeaconProxy(beacon, Greeter, ['Hello, Hardhat!']);
  t.is(await upgrades.erc1967.getAdminAddress(await beaconProxy.getAddress()), ethers.ZeroAddress);
  t.not(await upgrades.erc1967.getBeaconAddress(await beaconProxy.getAddress()), ethers.ZeroAddress);
});
