const GreeterStandaloneImpl = artifacts.require('GreeterStandaloneImpl');
const GreeterV2StandaloneImpl = artifacts.require('GreeterV2StandaloneImpl');
const GreeterFallback = artifacts.require('GreeterFallback');

module.exports = async function (deployer) {
  await deployer.deploy(GreeterStandaloneImpl);
  await deployer.deploy(GreeterV2StandaloneImpl);
  await deployer.deploy(GreeterFallback);
};
