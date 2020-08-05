const assert = require('assert');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Portfolio = artifacts.require('Portfolio');
const PortfolioV2 = artifacts.require('PortfolioV2');

contract('PortfolioWithoutFlag', function () {
  it('deployProxy', async function () {
    await assert.rejects(deployProxy(Portfolio));

    // we need use the flag to deploy in order to have an address to upgrade
    const portfolio = await deployProxy(Portfolio, [], { unsafeAllowCustomTypes: true });
    await assert.rejects(upgradeProxy(portfolio.address, PortfolioV2));
  });
});

contract('PortfolioWithFlag', function () {
  it('deployProxy', async function () {
    const portfolio = await deployProxy(Portfolio, [], { unsafeAllowCustomTypes: true });
    await upgradeProxy(portfolio.address, PortfolioV2, { unsafeAllowCustomTypes: true });
  });
});
