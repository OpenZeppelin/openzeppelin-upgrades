require('dotenv').config();

require('@openzeppelin/hardhat-defender');

module.exports = {
  solidity: {
    compilers: [{ version: '0.6.7' }],
  },
  defaultNetwork: 'local',
  networks: {
    local: {
      url: 'http://localhost:8545',
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_TOKEN}`,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  defender: {
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
  },
};
