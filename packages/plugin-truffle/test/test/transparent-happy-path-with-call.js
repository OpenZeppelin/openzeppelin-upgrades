const assert = require('assert');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');

contract('Greeter', function () {
  it('upgrade includes call with args', async function () {
    const greeter = await deployProxy(Greeter, ['Hello Truffle'], { kind: 'transparent' });

    assert.strictEqual(await greeter.greet(), 'Hello Truffle');

    await upgradeProxy(greeter, GreeterV2, {
      call: { fn: 'setGreeting', args: ['Called during upgrade'] },
    });

    assert.strictEqual(await greeter.greet(), 'Called during upgrade');
  });

  it('upgrade includes call without args', async function () {
    const greeter = await deployProxy(Greeter, ['Hello Truffle'], { kind: 'transparent' });

    assert.strictEqual(await greeter.greet(), 'Hello Truffle');

    await upgradeProxy(greeter, GreeterV2, {
      call: 'resetGreeting',
    });

    assert.strictEqual(await greeter.greet(), 'Hello World');
  });
});
