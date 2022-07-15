const assert = require('assert');

const { deployProxyAdmin, admin } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  await assert.rejects(
    admin.getInstance(),
    error => error.message === 'No ProxyAdmin was found in the network manifest',
  );

  const deployed = await deployProxyAdmin({ deployer });
  const instanceAddr = (await admin.getInstance()).address;
  assert.equal(deployed, instanceAddr);
};
