require('@openzeppelin/hardhat-upgrades');

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
              '': ['storageLayout'],
            },
          },
        },
      },
      {
        version: '0.7.6',
        settings: {
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
              '': ['storageLayout'],
            },
          },
        },
      },
      {
        version: '0.6.12',
        settings: {
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
              '': ['storageLayout'],
            },
          },
        },
      },
      {
        version: '0.5.17',
        settings: {
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
              '': ['storageLayout'],
            },
          },
        },
      },
    ],
  },
};
