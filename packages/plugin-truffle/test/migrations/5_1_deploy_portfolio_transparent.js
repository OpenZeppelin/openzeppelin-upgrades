const Portfolio = artifacts.require('Portfolio');
const PortfolioV2 = artifacts.require('PortfolioV2');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const a = await deployProxy(Portfolio, [], { deployer, kind: 'transparent' });
  await upgradeProxy(a, PortfolioV2, { deployer });
};
