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
          './artifacts/contracts/**/*.json',
        ],
        readDirectory: [
          './artifacts',
          './artifacts/build-info',
          './artifacts/contracts',
          './out',
        ],
      },
    },
  },
};

export default config;