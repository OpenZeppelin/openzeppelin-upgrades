import './type-extensions.js';
import type { HardhatPlugin } from 'hardhat/types/plugins';

const plugin: HardhatPlugin = {
  id: '@openzeppelin/hardhat-upgrades',

  hookHandlers: {
    config: () => import('./hooks/config.js'),
    solidity: () => import('./hooks/solidity.js'),
  },

  dependencies: () => [import('@nomicfoundation/hardhat-ethers').then(m => ({ default: m.default }))],

  conditionalDependencies: [
    {
      condition: () => [import('@nomicfoundation/hardhat-verify').then(m => ({ default: m.default }))],
      plugin: () => import('./verify-plugin.js'),
    },
  ],
};

export default plugin;

// Public API - Factory functions
export { upgrades, defender } from './utils/factory.js';

// Types
export type { HardhatUpgrades, DefenderHardhatUpgrades } from './types.js';

// Utilities
export type { UpgradeOptions } from './utils/options.js';

export { proxyFilesToBuild } from './utils/npmFilesToBuild.js';
