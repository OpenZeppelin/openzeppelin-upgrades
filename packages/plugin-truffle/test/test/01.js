const assert = require('assert');

const { deployProxy, upgradeProxy } = require('@openzeppelin/upgrades-truffle');

const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');

contract('Greeter', function ([, other]) {
  it('greeting', async function () {
    const greeter = await Greeter.deployed();
    assert.strictEqual(await greeter.greet({ from: other }), 'Hello Truffle');
  });

  it('deployProxy', async function () {
    const greeter = await deployProxy(Greeter, ['Hello Truffle']);
    await upgradeProxy(greeter.address, GreeterV2, ['Hello Truffle']);
  });
});
