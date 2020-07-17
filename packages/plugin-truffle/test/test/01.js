const assert = require('assert');

const Greeter = artifacts.require('Greeter');

contract('Greeter', function ([, other]) {
  it('greeting', async function () {
    const greeter = await Greeter.deployed();
    assert.strictEqual(await greeter.greet({ from: other }), 'Hello Truffle');
  });
});
