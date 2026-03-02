import { defineConfig } from 'hardhat/config';
import hardhatUpgrades, { proxyFilesToBuild } from '@openzeppelin/hardhat-upgrades';

if (!process.env.FOUNDRY_OUT) {
  process.env.FOUNDRY_OUT = 'artifacts/contracts';
}

export default defineConfig({
  plugins: [hardhatUpgrades],
  solidity: {
    version: '0.8.28',
    npmFilesToBuild: [...proxyFilesToBuild()],
    settings: {
      evmVersion: 'cancun',
      optimizer: {
        enabled: true,
        runs: 200,
      },
    }
  },
  test: {
    solidity: {
      ffi: true,
      fsPermissions: {
        readDirectory: ['artifacts/contracts'],
      },
    },
  },
});
