import 'dotenv/config';

// Set FOUNDRY_OUT for testing (can be overridden by .env file or inline env var)
if (!process.env.FOUNDRY_OUT) {
  process.env.FOUNDRY_OUT = 'artifacts/contracts';
}

import type { HardhatUserConfig } from 'hardhat/config';
import type { SolcUserConfig } from 'hardhat/types/config';
import hardhatVerify from '@nomicfoundation/hardhat-verify';
import hardhatEthers from '@nomicfoundation/hardhat-ethers';
import upgradesPlugin from './dist/index.js';

const override: SolcUserConfig = {
  version: '0.8.10',
  settings: {
    optimizer: {
      enabled: true,
    },
  },
};


const config: HardhatUserConfig = {
  plugins: [hardhatVerify, hardhatEthers, upgradesPlugin],
  solidity: {
    compilers: [
      {
        version: '0.8.29',
      },
      {
        version: '0.8.9',
      },
      {
        version: '0.7.6',
      },
      {
        version: '0.6.12',
      },
      {
        version: '0.5.17',
      },
    ],
    overrides: {
      'contracts/GapV1.sol': override,
      'contracts/GapV2.sol': override,
      'contracts/GapV2_Bad.sol': override,
    },
    npmFilesToBuild: [
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol",
      "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol",
      "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol",
      "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol",
      "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol",
    ]
  },
  paths: {
    tests: {
      solidity: "./test/solidity"
    }
  },
  test: {
    solidity: {
      ffi: true,
      fsPermissions: {
        readFile: [
          './hardhat.config.ts',
          './hardhat.config.js',
          './artifacts/**/*.json',
        ],
        readDirectory: [
          './artifacts',
          './artifacts/build-info',
          './artifacts/contracts',
          './artifacts/@openzeppelin',
          './out',
        ],
      },
    },
  },
};

export default config;