const test = require('ava');

const hre = require('hardhat');
const { ethers, upgrades } = hre;
const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
});

test('transferProxyAdminOwnership', async t => {
  // we need to deploy a proxy so we have a Proxy Admin
  const { Greeter } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });

  await upgrades.admin.transferProxyAdminOwnership(await greeter.getAddress(), testAddress);

  const adminAddress = await upgrades.erc1967.getAdminAddress(await greeter.getAddress());
  const admin = await hre.ethers.getContractAt(['function owner() view returns (address)'], adminAddress);
  const newOwner = await admin.owner();

  t.is(newOwner, testAddress);
});
