import { defineConfig } from 'hardhat/config';
import hardhatEthers from '@nomicfoundation/hardhat-ethers';
import hardhatUpgrades from '@openzeppelin/hardhat-upgrades';

export default defineConfig({
  plugins: [hardhatEthers, hardhatUpgrades],
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // localhost: {
    //   url: 'http://127.0.0.1:8545',
    // },
    // Example testnet configuration (uncomment and configure as needed)
    // sepolia: {
    //   url: process.env.SEPOLIA_URL || '',
    //   accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    // },
  },
  test: {
    solidity: {
      ffi: true,
    },
  },
});
