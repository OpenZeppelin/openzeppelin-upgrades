const assert = require('assert');
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('Greeter');

contract('Greeter', function () {
  it('Block deployProxy with beacon kind', async function () {
    // TODO change the expected message when beacon proxies are supported but in a different function
    await assert.rejects(deployProxy(Greeter, ['Hello Truffle'], { kind: 'beacon' }), error =>
      error.message.includes('Beacon proxy is not currently supported with Truffle Upgrades.'),
    );
  });
});
