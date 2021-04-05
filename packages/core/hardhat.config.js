require('dotenv/config');

require('@nomiclabs/hardhat-etherscan');

const settings = {
  optimizer: {
    enabled: true,
    runs: 200,
  },
};

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
      { version: '0.8.2', settings },
    ],
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
