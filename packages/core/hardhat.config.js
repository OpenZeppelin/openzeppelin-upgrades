require('dotenv/config');

require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');

const settings = {
  optimizer: {
    enabled: true,
    runs: 200,
  },
  outputSelection: {
    '*': {
      '*': ['storageLayout'],
    },
  },
};

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    mainnet: {
      url: 'https://cloudflare-eth.com',
    },
  },
  solidity: {
    compilers: [
      { version: '0.5.16', settings },
      { version: '0.6.12', settings },
      { version: '0.7.6', settings },
      { version: '0.8.8', settings },
      { version: '0.8.9', settings },
    ],
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
    },
  },
};
