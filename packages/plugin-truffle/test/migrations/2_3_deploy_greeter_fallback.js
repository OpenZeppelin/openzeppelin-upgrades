const GreeterFallback = artifacts.require('GreeterFallback');

module.exports = async function (deployer) {
  deployer.deploy(GreeterFallback);
};
