require('@openzeppelin/hardhat-upgrades');
require('@openzeppelin/hardhat-defender');

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.5.15',
      },
      {
        version: '0.6.7',
      },
    ],
  },
  defender: {
    apiKey: 'KEY',
    apiSecret: 'SECRET',
  },
};
