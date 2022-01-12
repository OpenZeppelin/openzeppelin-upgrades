const assert = require('assert');
const { deployBeacon, deployBeaconProxy, upgradeBeacon } = require('@openzeppelin/truffle-upgrades');

const Action = artifacts.require('Action');
const ActionV2 = artifacts.require('ActionV2');
const ActionV2Bad = artifacts.require('ActionV2Bad');

contract('Action', function () {
  it('compatible enums', async function () {
    const beacon = await deployBeacon(Action);
    await deployBeaconProxy(beacon, Action, []);
    await upgradeBeacon(beacon, ActionV2);
  });

  it('incompatible enums', async function () {
    const beacon = await deployBeacon(Action);
    await deployBeaconProxy(beacon, Action, []);
    await assert.rejects(upgradeBeacon(beacon, ActionV2Bad), error =>
      error.message.includes('Upgraded `action` to an incompatible type'),
    );
  });
});
