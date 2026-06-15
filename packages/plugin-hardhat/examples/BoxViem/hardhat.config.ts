import { defineConfig } from 'hardhat/config';
import hardhatViem from '@nomicfoundation/hardhat-viem';
// Import the plugin from the `/viem` entry point, whose declaration chain never references
// @nomicfoundation/hardhat-ethers, so a viem-only project (without ethers installed) type-checks.
import hardhatUpgrades from '@openzeppelin/hardhat-upgrades/viem';

export default defineConfig({
  plugins: [hardhatViem, hardhatUpgrades],
  solidity: '0.8.28',
});
