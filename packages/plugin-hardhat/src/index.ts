import './type-extensions.js';
import { overrideTask } from 'hardhat/config';
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

  tasks: [
    // Force a full recompile when the validations cache is outdated or missing,
    // so that the cache is regenerated transparently after a schema bump.
    // Hardhat 3 registers `compile` and `build` as separate task IDs pointing at
    // the same action, so we override both.
    overrideTask('compile')
      .setAction(async () => import('./compile-task-action.js'))
      .build(),
    overrideTask('build')
      .setAction(async () => import('./compile-task-action.js'))
      .build(),
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
