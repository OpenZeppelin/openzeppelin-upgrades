const assert = require('assert');

const { deployBeacon, deployBeaconProxy, upgradeBeacon } = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');

contract('Greeter', function () {
  it('upgrade includes call with args', async function () {
    const beacon = await deployBeacon(Greeter);
    const greeter = await deployBeaconProxy(beacon, ['Hello Truffle']);

    assert.strictEqual(await greeter.greet(), 'Hello Truffle');

    await upgradeBeacon(beacon, GreeterV2, {
      call: { fn: 'setGreeting', args: ['Called during upgrade'] },
    });
    // the above call does nothing useful since beacon upgrades do not use that option

    assert.strictEqual(await greeter.greet(), 'Hello Truffle');
  });

  it('upgrade includes call without args', async function () {
    const beacon = await deployBeacon(Greeter);
    const greeter = await deployBeaconProxy(beacon, ['Hello Truffle']);

    assert.strictEqual(await greeter.greet(), 'Hello Truffle');

    await upgradeBeacon(beacon, GreeterV2, {
      call: 'resetGreeting',
    });
    // the above call does nothing useful since beacon upgrades do not use that option

    assert.strictEqual(await greeter.greet(), 'Hello Truffle');
  });
});
