require('dotenv/config');

require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');

const settings = {
  optimizer: {
    enabled: true,
    runs: 200,
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
    kovan: {
      url: process.env.KOVAN_URL,
      accounts: [process.env.KOVAN_KEY],
    },
    rinkeby: {
      url: process.env.RINKEBY_URL,
      accounts: [process.env.RINKEBY_KEY],
    },
    ropsten: {
      url: process.env.ROPSTEN_URL,
      accounts: [process.env.ROPSTEN_KEY],
    },
    goerli: {
      url: process.env.GOERLI_URL,
      accounts: {
        mnemonic: process.env.GOERLI_MNEMONIC,
      },
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
