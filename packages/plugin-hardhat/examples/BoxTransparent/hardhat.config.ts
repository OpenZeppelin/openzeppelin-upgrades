import { defineConfig } from 'hardhat/config';
import hardhatUpgrades from '@openzeppelin/hardhat-upgrades';

export default defineConfig({
  plugins: [hardhatUpgrades],
  solidity: '0.8.28',
});
