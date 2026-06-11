import { defineConfig } from 'hardhat/config';
import hardhatViem from '@nomicfoundation/hardhat-viem';
import hardhatUpgrades from '@openzeppelin/hardhat-upgrades';

export default defineConfig({
  plugins: [hardhatViem, hardhatUpgrades],
  solidity: '0.8.28',
});
