const test = require('ava');

const { ethers, upgrades, network } = require('hardhat');
const { getAdminAddress } = require('@openzeppelin/upgrades-core');

const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
});

test('changeProxyAdmin', async t => {
  const { Greeter } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!']);
  await upgrades.admin.changeProxyAdmin(greeter.address, testAddress);
  const newAdmin = await getAdminAddress(network.provider, greeter.address);

  t.is(newAdmin, testAddress);
});
