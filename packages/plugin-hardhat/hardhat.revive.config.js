require('@openzeppelin/hardhat-upgrades');
require('@parity/hardhat-polkadot');
require('@nomicfoundation/hardhat-chai-matchers');

const { subtask } = require('hardhat/config');
function shouldIgnoreFile(filePath, ignorePatterns) {
  return ignorePatterns.some(pattern => {
    return filePath.includes(pattern);
  });
}

subtask('compile:solidity:get-source-paths').setAction(async (args, hre, runSuper) => {
  const paths = await runSuper();
  // Get ignore patterns from config or use defaults
  const ignorePatterns = hre.config.ignorePatterns || [];

  // Filter out ignored paths
  const filteredPaths = paths.filter(sourcePath => {
    const shouldIgnore = shouldIgnoreFile(sourcePath, ignorePatterns);

    return !shouldIgnore;
  });

  return filteredPaths;
});

const override = {
  version: '0.8.10',
  settings: {
    optimizer: {
      enabled: true,
    },
  },
};

const SELFDESTRUCT_IGNORES = ['contracts/Invalid.sol'];

module.exports = {
  networks: {
    hardhat: {
      polkadot: true,
      nodeConfig: {
        nodeBinaryPath: './bin/dev-node',
        dev: true,
        consensus: {
          seal: 'instant-seal',
        },
        rpcPort: 8000,
      },
      adapterConfig: {
        adapterBinaryPath: './bin/eth-rpc',
        dev: true,
      },
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.28',
      },
    ],
    overrides: {
      'contracts/GapV1.sol': override,
      'contracts/GapV2.sol': override,
      'contracts/GapV2_Bad.sol': override,
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['storageLayout'],
        },
      },
    },
  },
  paths: {
    artifacts: './artifacts-pvm',
    cache: './cache-pvm',
  },
  ignorePatterns: [...SELFDESTRUCT_IGNORES],
};
