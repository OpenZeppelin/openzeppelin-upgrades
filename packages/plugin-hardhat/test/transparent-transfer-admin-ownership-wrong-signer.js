const test = require('ava');

const hre = require('hardhat');
const { ethers, upgrades } = hre;
const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
});

test('transferProxyAdminOwnership - wrong signer', async t => {
  // we need to deploy a proxy so we have a Proxy Admin
  const { Greeter } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });

  const signer = await ethers.provider.getSigner(1);

  const proxyAddress = await greeter.getAddress();

  await t.throwsAsync(
    () => upgrades.admin.transferProxyAdminOwnership(proxyAddress, testAddress, signer),
    { message: /0x118cdaa7/ }, // bytes4(keccak256('OwnableUnauthorizedAccount(address)'))
  );
});
