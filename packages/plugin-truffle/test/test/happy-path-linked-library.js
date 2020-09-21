const assert = require('assert');
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const AdderV3 = artifacts.require('AdderV3');

contract('AdderV3 without flag', function () {
  it('deployProxy', async function () {
    await assert.rejects(deployProxy(AdderV3));

    // we need use the flag to deploy in order to have an address to upgrade
    const adder3 = await deployProxy(AdderV3, [1], { unsafeAllowLinkedLibraries: true });
    await assert.rejects(upgradeProxy(adder3.address, AdderV3));
  });
});

contract('AdderV3 with flag', function () {
  it('deployProxy', async function () {
    const adder3 = await deployProxy(AdderV3, [1], { unsafeAllowLinkedLibraries: true });
    await upgradeProxy(adder3.address, AdderV3, { unsafeAllowLinkedLibraries: true });
  });
});
