const assert = require('assert');

const { deployProxy, loadProxy } = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('Greeter');
const GreeterProxiable = artifacts.require('GreeterProxiable');
const GreeterStandaloneImpl = artifacts.require('GreeterStandaloneImpl');

contract('Greeter', function () {
  it('load transparent proxy from loadProxy', async function () {
    const greeter = await deployProxy(Greeter, ['Hello Truffle'], { kind: 'transparent' });
    const loaded = await loadProxy(greeter.address);
    assert.equal(await loaded.greet(), 'Hello Truffle');
  });

  it('load transparent proxy from loadProxy with contract instance', async function () {
    const greeter = await deployProxy(Greeter, ['Hello Truffle'], { kind: 'transparent' });
    const loaded = await loadProxy(greeter);
    assert.equal(await loaded.greet(), 'Hello Truffle');
  });

  it('load uups proxy from loadProxy', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello Truffle'], { kind: 'uups' });
    const loaded = await loadProxy(greeter.address);
    assert.equal(await loaded.greet(), 'Hello Truffle');
  });

  it('load uups proxy from loadProxy with contract instance', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello Truffle'], { kind: 'uups' });
    const loaded = await loadProxy(greeter);
    assert.equal(await loaded.greet(), 'Hello Truffle');
  });

  it('load non-proxy address with loadProxy', async function () {
    const greeter = await GreeterStandaloneImpl.deployed();

    await assert.rejects(loadProxy(greeter.address), error =>
      /Contract at \S+ doesn't look like a supported proxy/.test(error.message),
    );
  });
});
