const test = require('ava');

const hre = require('hardhat');
const { getManifestAdmin } = require('@openzeppelin/hardhat-upgrades/dist/admin.js');
const { ethers, upgrades } = hre;
const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

test('transferProxyAdminOwnership - signer', async t => {
  // we need to deploy a proxy so we have a Proxy Admin
  const signer = (await ethers.getSigners())[1];
  const Greeter = await ethers.getContractFactory('Greeter', signer);

  await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });

  const admin = await getManifestAdmin(hre);
  await upgrades.admin.transferProxyAdminOwnership(testAddress, signer);
  const newOwner = await admin.owner();

  t.is(newOwner, testAddress);
});
