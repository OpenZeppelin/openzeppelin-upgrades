const assert = require('assert');

const { deployBeacon, deployBeaconProxy, upgradeBeacon } = require('@openzeppelin/truffle-upgrades');

const Portfolio = artifacts.require('Portfolio');
const PortfolioV2 = artifacts.require('PortfolioV2');
const PortfolioV2Bad = artifacts.require('PortfolioV2Bad');

contract('Portfolio', function () {
  it('compatible struct', async function () {
    const beacon = await deployBeacon(Portfolio);
    await deployBeaconProxy(beacon, []);
    await upgradeBeacon(beacon, PortfolioV2);
  });

  it('incompatible struct', async function () {
    const beacon = await deployBeacon(Portfolio);
    await deployBeaconProxy(beacon, []);
    await assert.rejects(upgradeBeacon(beacon, PortfolioV2Bad), error =>
      error.message.includes('Upgraded `assets` to an incompatible type'),
    );
  });
});
