const { ethers, upgrades } = require('@nomiclabs/buidler');

async function withoutFlag() {
  const Portfolio = await ethers.getContractFactory('Portfolio');
  const portfolio = await upgrades.deployProxy(Portfolio);

  console.log('Attempting upgrade to PortfolioV2...');
  const PortfolioV2 = await ethers.getContractFactory('PortfolioV2');
  const portfolio2 = await upgrades.upgradeProxy(portfolio.address, PortfolioV2);

  console.log('Enabling...');
  await portfolio2.enable('ETH');
}

async function withFlag() {
  const Portfolio = await ethers.getContractFactory('Portfolio');
  const portfolio = await upgrades.deployProxy(Portfolio, [], { unsafeAllowCustomTypes: true });

  console.log('Attempting upgrade to PortfolioV2...');
  const PortfolioV2 = await ethers.getContractFactory('PortfolioV2');
  const portfolio2 = await upgrades.upgradeProxy(portfolio.address, PortfolioV2, { unsafeAllowCustomTypes: true });

  console.log('Enabling...');
  await portfolio2.enable('ETH');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
withoutFlag()
  .then(() => {
    // this should not happen
    console.error('Expected failure did not happen');
    process.exit(1);
  })
  .catch(error => {
    console.error(error);
    return withFlag();
  })
  .then(() => process.exit(0))
  .catch(error => {
    // this should not happen
    console.error(error);
    process.exit(1);
  });
