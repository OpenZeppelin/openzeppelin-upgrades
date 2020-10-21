const test = require('ava');

const { ethers, upgrades } = require('@nomiclabs/buidler');

test.before(async t => {
  t.context.Portfolio = await ethers.getContractFactory('Portfolio');
  t.context.PortfolioV2 = await ethers.getContractFactory('PortfolioV2');
});

test('deployProxy without flag', async t => {
  const { Portfolio } = t.context;
  await t.throwsAsync(() => upgrades.deployProxy(Portfolio));
});

test('deployProxy with flag', async t => {
  const { Portfolio } = t.context;
  const portfolio = await upgrades.deployProxy(Portfolio, [], { unsafeAllowCustomTypes: true });
  await portfolio.enable('ETH');
});

test('upgradeProxy without flag', async t => {
  const { Portfolio, PortfolioV2 } = t.context;
  const portfolio = await upgrades.deployProxy(Portfolio, [], { unsafeAllowCustomTypes: true });
  await t.throwsAsync(() => upgrades.upgradeProxy(portfolio.address, PortfolioV2));
});

test('upgradeProxy with flag', async t => {
  const { Portfolio, PortfolioV2 } = t.context;
  const portfolio = await upgrades.deployProxy(Portfolio, [], { unsafeAllowCustomTypes: true });
  const portfolio2 = await upgrades.upgradeProxy(portfolio.address, PortfolioV2, { unsafeAllowCustomTypes: true });
  await portfolio2.enable('ETH');
});
