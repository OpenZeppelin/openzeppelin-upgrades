const Token = artifacts.require('Token');
const TokenV2 = artifacts.require('TokenV2');
const TokenV3 = artifacts.require('TokenV3');
const SafeMath = artifacts.require('SafeMath');
const SafeMathV2 = artifacts.require('SafeMathV2');
const SafePercent = artifacts.require('SafePercent');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  await deployer.deploy(SafeMath);
  await deployer.deploy(SafeMathV2);
  await deployer.deploy(SafePercent);

  await deployer.link(SafeMath, Token);
  const t = await deployProxy(Token, ['TKN', 10000], {
    deployer,
    unsafeAllow: ['external-library-linking'],
    kind: 'transparent',
  });

  await deployer.link(SafeMath, TokenV2);
  await upgradeProxy(t, TokenV2, { deployer, unsafeAllow: ['external-library-linking'] });

  await deployer.link(SafeMath, TokenV3);
  await deployer.link(SafePercent, TokenV3);
  await upgradeProxy(t, TokenV3, { deployer, unsafeAllow: ['external-library-linking'] });
};
