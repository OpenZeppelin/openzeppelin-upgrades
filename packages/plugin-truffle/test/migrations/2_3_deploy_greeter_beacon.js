const GreeterBeaconImpl = artifacts.require('GreeterBeaconImpl');

const { deployBeacon, deployBeaconProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const beacon = await deployBeacon(GreeterBeaconImpl, { deployer });
  await deployBeaconProxy(beacon, ['Hello Truffle'], { deployer });
};
