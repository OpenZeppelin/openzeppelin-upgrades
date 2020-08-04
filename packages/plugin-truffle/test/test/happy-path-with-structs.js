const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Portfolio = artifacts.require('Portfolio');
const PortfolioV2 = artifacts.require('PortfolioV2');

contract('Portfolio', function () {
  it('deployProxy', async function () {
    const portfolio = await deployProxy(Portfolio, [], { unsafeAllowCustomTypes: true });
    await upgradeProxy(portfolio.address, PortfolioV2, { unsafeAllowCustomTypes: true });
  });
});
