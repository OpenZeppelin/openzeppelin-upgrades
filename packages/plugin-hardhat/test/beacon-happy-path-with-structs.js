import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  upgrades.silenceWarnings();
  
  t.context.Portfolio = await ethers.getContractFactory('Portfolio');
  t.context.PortfolioV2 = await ethers.getContractFactory('PortfolioV2');
  t.context.PortfolioV2Bad = await ethers.getContractFactory('PortfolioV2Bad');
});

test('deployBeaconProxy', async t => {
  const { Portfolio } = t.context;
  const beacon = await upgrades.deployBeacon(Portfolio);
  await beacon.waitForDeployment();

  const portfolio = await upgrades.deployBeaconProxy(beacon, Portfolio, []);
  await portfolio.waitForDeployment();

  await portfolio.enable('ETH');
});

test('upgradeBeacon', async t => {
  const { Portfolio, PortfolioV2 } = t.context;
  const beacon = await upgrades.deployBeacon(Portfolio);
  await beacon.waitForDeployment();

  const portfolio = await upgrades.deployBeaconProxy(beacon, Portfolio, []);
  await portfolio.waitForDeployment();

  await upgrades.upgradeBeacon(beacon, PortfolioV2);

  const portfolio2 = PortfolioV2.attach(await portfolio.getAddress());
  await portfolio2.enable('ETH');
});

test('upgradeBeacon with incompatible layout', async t => {
  const { Portfolio, PortfolioV2Bad } = t.context;

  const beacon = await upgrades.deployBeacon(Portfolio);
  await upgrades.deployBeaconProxy(beacon, Portfolio, []);
  const error = await t.throwsAsync(() => upgrades.upgradeBeacon(beacon, PortfolioV2Bad));
  t.true(error.message.includes('Upgraded `assets` to an incompatible type'));
});
