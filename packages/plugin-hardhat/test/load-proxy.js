const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
});

test('load transparent proxy from loadProxy', async t => {
  const { Greeter } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
  const loaded = await upgrades.loadProxy(greeter.address, greeter.signer);
  t.is(await loaded.greet(), 'Hello, Hardhat!');
});

test('load transparent proxy from loadProxy with factory', async t => {
  const { Greeter } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
  const loaded = await upgrades.loadProxy(greeter);
  t.is(await loaded.greet(), 'Hello, Hardhat!');
});

test('load uups proxy from loadProxy', async t => {
  const { GreeterProxiable } = t.context;
  const greeter = await upgrades.deployProxy(GreeterProxiable, ['Hello, Hardhat!'], { kind: 'uups' });
  const loaded = await upgrades.loadProxy(greeter.address, greeter.signer);
  t.is(await loaded.greet(), 'Hello, Hardhat!');
});

test('load uups proxy from loadProxy with factory', async t => {
  const { GreeterProxiable } = t.context;
  const greeter = await upgrades.deployProxy(GreeterProxiable, ['Hello, Hardhat!'], { kind: 'uups' });
  const loaded = await upgrades.loadProxy(greeter.address, greeter.signer);
  t.is(await loaded.greet(), 'Hello, Hardhat!');
});

test('load proxy with address but without a signer', async t => {
  const { GreeterProxiable } = t.context;
  const greeter = await upgrades.deployProxy(GreeterProxiable, ['Hello, Hardhat!'], { kind: 'uups' });
  try {
    await upgrades.loadProxy(greeter.address);
    t.fail('Expected an error since loadProxy() was called with only an address');
  } catch (e) {
    t.is(e.message, 'loadProxy() must be called with a contract instance or both a contract address and a signer.');
  }
});

test('load non-proxy address with loadProxy', async t => {
  const { GreeterProxiable } = t.context;
  const greeter = await GreeterProxiable.deploy();
  await greeter.deployed();

  try {
    await upgrades.loadProxy(greeter.address, greeter.signer);
    t.fail('Expected an error since loadProxy() was called with a non-proxy address');
  } catch (e) {
    t.true(/Contract at \S+ doesn't look like a supported proxy/.test(e.message), e.message);
  }
});
