const assert = require('assert');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Portfolio = artifacts.require('Portfolio');
const PortfolioV2 = artifacts.require('PortfolioV2');
const PortfolioV2Bad = artifacts.require('PortfolioV2Bad');

contract('Portfolio', function () {
  it('compatible struct', async function () {
    const portfolio = await deployProxy(Portfolio, []);
    await upgradeProxy(portfolio.address, PortfolioV2);
  });

  it('incompatible struct', async function () {
    const portfolio = await deployProxy(Portfolio, []);
    await assert.rejects(upgradeProxy(portfolio.address, PortfolioV2Bad), error =>
      error.message.includes('Upgraded `assets` to an incompatible type'),
    );
  });
});
