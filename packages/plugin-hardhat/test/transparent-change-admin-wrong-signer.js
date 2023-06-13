const test = require('ava');

const { ethers, upgrades } = require('hardhat');

const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
});

test('changeProxyAdmin - wrong signer', async t => {
  const { Greeter } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });

  const signer = (await ethers.getSigners())[1];

  const addr = await greeter.getAddress();
  await t.throwsAsync(() => upgrades.admin.changeProxyAdmin(addr, testAddress, signer), {
    message: /(caller is not the owner)/,
  });
});
