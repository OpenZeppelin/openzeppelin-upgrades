require('dotenv/config');

require('@nomiclabs/hardhat-etherscan');

module.exports = {
  networks: {
    mainnet: {
      url: 'https://cloudflare-eth.com',
    },
  },
  solidity: {
    version: '0.6.8',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
