const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3Proxiable');
});

test('prepare upgrade with transaction response', async t => {
  const { Greeter, GreeterV3 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'uups' });

  const txResponse = await upgrades.prepareUpgrade(greeter.address, GreeterV3, { getTxResponse: true });

  const precomputedAddress = ethers.utils.getContractAddress(txResponse);
  const txReceipt = await txResponse.wait();

  t.is(txReceipt.contractAddress, precomputedAddress);

  const greeter3 = GreeterV3.attach(txReceipt.contractAddress);
  const version3 = await greeter3.version();
  t.is(version3, 'V3');
});
