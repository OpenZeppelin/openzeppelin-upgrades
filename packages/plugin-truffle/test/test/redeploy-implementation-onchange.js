const assert = require('assert');

const { deployImplementation } = require('@openzeppelin/truffle-upgrades');

const GreeterDeployImpl = artifacts.require('GreeterDeployImpl');
const GreeterV2DeployImpl = artifacts.require('GreeterV2DeployImpl');

contract('Greeter', function () {
  it('onchange', async function () {
    const impl1 = await deployImplementation(GreeterDeployImpl);
    const impl2 = await deployImplementation(GreeterDeployImpl, { redeployImplementation: 'onchange' });
    assert.equal(impl2, impl1);

    const impl3 = await deployImplementation(GreeterV2DeployImpl, { redeployImplementation: 'onchange' });
    assert.notEqual(impl3, impl1);
  });
});
