require('@openzeppelin/hardhat-upgrades');

const override = {
  version: '0.8.10',
  settings: {
    optimizer: {
      enabled: true,
    },
  },
};

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
      },
      {
        version: '0.7.6',
      },
      {
        version: '0.6.12',
      },
      {
        version: '0.5.17',
      },
    ],
    overrides: {
      'contracts/GapV1.sol': override,
      'contracts/GapV2.sol': override,
      'contracts/GapV2_Bad.sol': override,
    },
  },
};
