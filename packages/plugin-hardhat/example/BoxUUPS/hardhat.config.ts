import { defineConfig } from 'hardhat/config';
import hardhatEthers from '@nomicfoundation/hardhat-ethers';
import hardhatUpgrades from '@openzeppelin/hardhat-upgrades';

export default defineConfig({
  plugins: [hardhatEthers, hardhatUpgrades],
  solidity: '0.8.28',
});
