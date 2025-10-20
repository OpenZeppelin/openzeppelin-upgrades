import type { HardhatUserConfig } from 'hardhat/config';
import type { SolcUserConfig } from 'hardhat/types/config';
import hardhatVerify from '@nomicfoundation/hardhat-verify';
import hardhatEthers from '@nomicfoundation/hardhat-ethers';

const override: SolcUserConfig = {
  version: '0.8.10',
  settings: {
    optimizer: {
      enabled: true,
    },
  },
};

const config: HardhatUserConfig = {
  plugins: [hardhatVerify, hardhatEthers],
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
};

export default config;
