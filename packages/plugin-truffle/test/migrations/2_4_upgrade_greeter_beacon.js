const GreeterBeaconImpl = artifacts.require('GreeterBeaconImpl');
const GreeterV2 = artifacts.require('GreeterV2');

const { upgradeBeacon } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const beacon = await GreeterBeaconImpl.deployed();
  await upgradeBeacon(beacon, GreeterV2, { deployer });
};
