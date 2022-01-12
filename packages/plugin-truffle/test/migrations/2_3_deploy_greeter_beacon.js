const GreeterBeaconImpl = artifacts.require('GreeterBeaconImpl');
const GreeterV2 = artifacts.require('GreeterV2');

const { deployBeacon, deployBeaconProxy, upgradeBeacon } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const beacon = await deployBeacon(GreeterBeaconImpl, { deployer });
  await deployBeaconProxy(beacon, GreeterBeaconImpl, ['Hello Truffle'], { deployer });
  await upgradeBeacon(beacon, GreeterV2, { deployer });
};
