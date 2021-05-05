const assert = require('assert');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Portfolio = artifacts.require('PortfolioProxiable');
const PortfolioV2 = artifacts.require('PortfolioV2Proxiable');
const PortfolioV2Bad = artifacts.require('PortfolioV2BadProxiable');

contract('Portfolio', function () {
  it('compatible struct', async function () {
    const portfolio = await deployProxy(Portfolio, [], { kind: 'uups' });
    await upgradeProxy(portfolio, PortfolioV2);
  });

  it('incompatible struct', async function () {
    const portfolio = await deployProxy(Portfolio, [], { kind: 'uups' });
    await assert.rejects(upgradeProxy(portfolio, PortfolioV2Bad), error =>
      error.message.includes('Upgraded `assets` to an incompatible type'),
    );
  });
});
