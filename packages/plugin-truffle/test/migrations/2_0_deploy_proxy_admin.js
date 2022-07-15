const { deployProxyAdmin, admin } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const expected = 'No ProxyAdmin was found in the network manifest';
  try {
    await admin.getInstance();
    throw new Error('Expected an error');
  } catch (e) {
    if (e.message !== expected) {
      throw new Error(`Expected '${expected}' but got '${e.message}'`);
    }
  }

  const deployed = await deployProxyAdmin({ deployer });
  const instanceAddr = (await admin.getInstance()).address;
  if (deployed !== instanceAddr) {
    throw new Error(`Expected '${deployed}' but got '${instanceAddr}'`);
  }
};
