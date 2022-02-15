require('@openzeppelin/hardhat-upgrades');

const settings = {
  outputSelection: {
    '*': {
      '*': ['storageLayout'],
    },
  },
};

module.exports = {
  solidity: {
    compilers: [
      { version: '0.8.9', settings },
      { version: '0.7.6', settings },
      { version: '0.6.12', settings },
      { version: '0.5.17', settings },
    ],
  },
};
