const fs = require('fs');
const path = require('path');

require('dotenv/config');

require('@nomicfoundation/hardhat-ethers');

for (const f of fs.readdirSync(path.join(__dirname, 'hardhat'))) {
  require(path.join(__dirname, 'hardhat', f));
}

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

const settingsWithParisEVM = {
  ...settings,
  evmVersion: 'paris',
};

const proxyCompiler = {
  version: require('./src/solidity-version.json'),
  settings: settingsWithParisEVM,
};

function getNamespacedOverrides() {
  const contracts = fs.readdirSync(path.join(__dirname, 'contracts', 'test'));
  const namespacedContracts = contracts.filter(c => c.startsWith('Namespaced'));
  const overrides = {};
  for (const c of namespacedContracts) {
    if (c === 'NamespacedToModify07.sol') {
      overrides[`contracts/test/${c}`] = { version: '0.7.6', settings };
    } else {
      overrides[`contracts/test/${c}`] = { version: '0.8.20', settings: settingsWithParisEVM };
    }
  }
  return overrides;
}

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
      proxyCompiler,
    ],
    overrides: getNamespacedOverrides(),
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
    },
  },
};
