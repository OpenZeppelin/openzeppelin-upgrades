const test = require('ava');

const { ethers, upgrades } = require('hardhat');

upgrades.silenceWarnings();

test.before(async t => {
  t.context.Portfolio = await ethers.getContractFactory('Portfolio');
  t.context.PortfolioV2 = await ethers.getContractFactory('PortfolioV2');
  t.context.PortfolioV2Bad = await ethers.getContractFactory('PortfolioV2Bad');
});

test('deployBeaconProxy', async t => {
  const { Portfolio } = t.context;
  const beacon = await upgrades.deployBeacon(Portfolio);
  await beacon.deployed();

  const portfolio = await upgrades.deployBeaconProxy(beacon, Portfolio, []);
  await portfolio.deployed();

  await portfolio.enable('ETH');
});

test('upgradeBeacon', async t => {
  const { Portfolio, PortfolioV2 } = t.context;
  const beacon = await upgrades.deployBeacon(Portfolio);
  await beacon.deployed();

  const portfolio = await upgrades.deployBeaconProxy(beacon, Portfolio, []);
  await portfolio.deployed();

  await upgrades.upgradeBeacon(beacon, PortfolioV2);

  const portfolio2 = PortfolioV2.attach(portfolio.address);
  await portfolio2.enable('ETH');
});

test('upgradeBeacon with incompatible layout', async t => {
  const { Portfolio, PortfolioV2Bad } = t.context;

  const beacon = await upgrades.deployBeacon(Portfolio);
  await upgrades.deployBeaconProxy(beacon, Portfolio, []);
  const error = await t.throwsAsync(() => upgrades.upgradeBeacon(beacon, PortfolioV2Bad));
  t.true(error.message.includes('Upgraded `assets` to an incompatible type'));
});
