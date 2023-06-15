const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3Proxiable');
});

test('prepare upgrade with txresponse', async t => {
  const { Greeter, GreeterV3 } = t.context;

  // deploy a proxy
  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'uups' });

  // prepare the upgrade and get tx response
  const txResponse = await upgrades.prepareUpgrade(await greeter.getAddress(), GreeterV3, { getTxResponse: true });

  const precomputedAddress = ethers.getCreateAddress(txResponse);
  const txReceipt = await txResponse.wait();

  t.is(txReceipt.contractAddress, precomputedAddress);

  const greeter3 = GreeterV3.attach(txReceipt.contractAddress);
  const version3 = await greeter3.version();
  t.is(version3, 'V3');
});

test('prepare upgrade twice with txresponse', async t => {
  const { Greeter, GreeterV3 } = t.context;

  // deploy a proxy
  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'uups' });

  // prepare the upgrade and get tx response
  const txResponse1 = await upgrades.prepareUpgrade(await greeter.getAddress(), GreeterV3, { getTxResponse: true });
  const txReceipt1 = await txResponse1.wait();

  // prepare another upgrade with the same impl
  const txResponse2 = await upgrades.prepareUpgrade(await greeter.getAddress(), GreeterV3, { getTxResponse: true });
  const txReceipt2 = await txResponse2.wait();

  t.is(txReceipt2.contractAddress, txReceipt1.contractAddress);
  t.is(txReceipt2.hash, txReceipt1.hash);
});
