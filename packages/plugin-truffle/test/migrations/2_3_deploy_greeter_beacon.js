const GreeterBeaconImpl = artifacts.require('GreeterBeaconImpl');
const GreeterV2 = artifacts.require('GreeterV2');

const { deployBeacon, deployBeaconProxy, upgradeBeacon } = require('@openzeppelin/truffle-upgrades');
const assert = require('assert');

module.exports = async function (deployer) {
  const beacon = await deployBeacon(GreeterBeaconImpl, { deployer });

  const proxy = await deployBeaconProxy(beacon, GreeterBeaconImpl, ['Hello Truffle'], { deployer });

  assert.equal(GreeterBeaconImpl.address, proxy.address);
  assert.equal(GreeterBeaconImpl.transactionHash, proxy.transactionHash);

  await upgradeBeacon(beacon, GreeterV2, { deployer });
};
