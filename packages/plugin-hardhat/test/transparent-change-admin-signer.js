const test = require('ava');

const { ethers, upgrades, network } = require('hardhat');
const { getAdminAddress } = require('@openzeppelin/upgrades-core');

const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

test('changeProxyAdmin - signer', async t => {
  const signer = (await ethers.getSigners())[1];
  const Greeter = await ethers.getContractFactory('Greeter', signer);

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
  await upgrades.admin.changeProxyAdmin(greeter.address, testAddress, signer);
  const newAdmin = await getAdminAddress(network.provider, greeter.address);

  t.is(newAdmin, testAddress);
});
