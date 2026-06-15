// The main entry point is the ethers-flavored API. Side-effect-importing `type-extensions.js`
// makes `connection.ethers` and `hre.upgrades` type-check, and re-exports the
// @nomicfoundation/hardhat-ethers types, for consumers that import only this plugin.
import './type-extensions.js';
import plugin from './plugin.js';

export default plugin;

// Public API - Factory functions
export { upgrades, defender } from './utils/factory.js';

// Types
export type { HardhatUpgrades, DefenderHardhatUpgrades } from './types.js';

// Utilities
export type { UpgradeOptions } from './utils/options.js';

export { proxyFilesToBuild } from './utils/npmFilesToBuild.js';
