const fs = require('fs');
const path = require('path');

require('dotenv/config');

require('@nomicfoundation/hardhat-ethers');
require('@parity/hardhat-polkadot');

const { subtask } = require("hardhat/config");
function shouldIgnoreFile(filePath, ignorePatterns) {
  const { minimatch } = require("minimatch");

  return ignorePatterns.some(pattern => {
    return filePath.includes(pattern);
  });
}

subtask("compile:solidity:get-source-paths")
  .setAction(async (args, hre, runSuper) => {
    const paths = await runSuper();

    // Get ignore patterns from config or use defaults
    const ignorePatterns = hre.config.ignorePatterns || IGNORE_PATTERNS;

    // Filter out ignored paths
    const filteredPaths = paths.filter(sourcePath => {
      const shouldIgnore = shouldIgnoreFile(sourcePath, ignorePatterns);

      return !shouldIgnore;
    });

    return filteredPaths;
  });

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
    } else if (c === 'NamespacedToModifyCustomLayout.sol') {
      overrides[`contracts/test/${c}`] = { version: '0.8.29', settings: settingsWithParisEVM };
    } else {
      // pin compiler version to the most recent Solidity version that Slang supports
      overrides[`contracts/test/${c}`] = { version: '0.8.28', settings: settingsWithParisEVM };
    }
  }
  return overrides;
}

const OLD_SOLIDITY_VERSION_IGNORES = [
  "contracts/Initializable.sol",
  "contracts/test/FunctionSignatures.sol",
  "contracts/test/ManifestMigrate.sol",
  "contracts/test/Memory05.sol",
  "contracts/test/Storage.sol",
  "contracts/test/Validations.sol",
  "contracts/test/ValidationsImport.sol",
  "contracts/test/ValidationsSameNameSafe.sol",
  "contracts/test/ValidationsSameNameUnsafe.sol",
  "contracts/test/Version.sol",
  "contracts/test/NamespacedToModify07.sol",
];

// consult with Eric about it
const SELFDESTRUCT_IGNORES = [
  "contracts/test/cli/ValidateSelfdestruct.sol",
  "contracts/test/ValidationsNatspecSelfdestruct.sol"
]

// raise the question with Torstent & Alberto
const LIBRARY_NOT_FOUND_IGNORES = [
  "contracts/test/NamespacedToModify.sol",
  "contracts/test/NamespacedToModifyImported.sol",
  "contracts/test/ValidationsNatspec.sol"
]

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    mainnet: {
      url: 'https://cloudflare-eth.com',
    },
    hardhat: {
      polkavm: true
    }
  },
  solidity: {
    compilers: [
      // { version: '0.5.16', settings },
      // { version: '0.6.12', settings },
      // { version: '0.7.6', settings },
      { version: '0.8.8', settings },
      { version: '0.8.9', settings },
      proxyCompiler,
    ],
    overrides: getNamespacedOverrides(),
    excludeContracts: ["contracts/Initializable.sol"]
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
    },
  },
  ignorePatterns: [
    ...OLD_SOLIDITY_VERSION_IGNORES,
    ...SELFDESTRUCT_IGNORES,
    ...LIBRARY_NOT_FOUND_IGNORES
  ],
  paths: {
    artifacts: './artifacts-pvm',
    cache: './cache-pvm'
  }
};
