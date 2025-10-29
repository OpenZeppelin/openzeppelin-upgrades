import '@nomicfoundation/hardhat-ethers';
import './type-extensions.js';
import type { HardhatPlugin } from 'hardhat/types/plugins';

const plugin: HardhatPlugin = {
  id: '@openzeppelin/hardhat-upgrades',

  hookHandlers: {
    config: () => import('./hooks/config.js'),
    solidity: () => import('./hooks/solidity.js'),
  },

  tasks: [],

  dependencies: () => {
    // Return array of promises to plugin modules
    return [import('@nomicfoundation/hardhat-ethers').then(m => ({ default: m.default }))];
  },
};

export default plugin;

// Public API - Factory functions
export { upgrades, defender } from './utils/factory.js';

// Types
export type { HardhatUpgrades, DefenderHardhatUpgrades } from './types.js';

// Utilities
export type { UpgradeOptions } from './utils/options.js';
