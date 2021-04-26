const Portfolio = artifacts.require('PortfolioProxiable');
const PortfolioV2 = artifacts.require('PortfolioV2Proxiable');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const a = await deployProxy(Portfolio, [], { deployer, kind: 'uups' });
  await upgradeProxy(a.address, PortfolioV2, { deployer });
};
