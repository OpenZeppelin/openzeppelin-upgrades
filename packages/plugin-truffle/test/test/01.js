const assert = require('assert');

const Greeter = artifacts.require('Greeter');

contract('Greeter', function () {
  it('greeting', async function () {
    const greeter = await Greeter.deployed();
    assert.strictEqual(await greeter.greet(), 'Hello Truffle');
  });
});
