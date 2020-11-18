const upgrades = require('@openzeppelin/truffle-upgrades');

upgrades.silenceWarnings();

const Migrations = artifacts.require('Migrations');

module.exports = function (deployer) {
  deployer.deploy(Migrations);
};
