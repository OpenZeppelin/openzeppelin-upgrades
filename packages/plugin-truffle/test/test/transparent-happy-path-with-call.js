const assert = require('assert');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');

contract('Greeter', function () {
  it('upgrade with call', async function () {
    const greeter = await deployProxy(Greeter, ['Hello Truffle'], { kind: 'transparent' });

    assert.strictEqual(await greeter.greet(), 'Hello Truffle');

    await upgradeProxy(greeter, GreeterV2, {
      call: { function: 'setGreeting', args: ['Called during upgrade'] },
    });

    assert.strictEqual(await greeter.greet(), 'Called during upgrade');
  });
});
