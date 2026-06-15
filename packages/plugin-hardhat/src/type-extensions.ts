import 'hardhat/types/hre';
import type { HardhatUpgrades, DefenderHardhatUpgrades } from './types.js';
import type { ContractFactory } from 'ethers';

// Re-export the types of @nomicfoundation/hardhat-ethers, which this plugin loads as a
// plugin dependency at runtime, so that `connection.ethers` is recognized by TypeScript
// without requiring users to register the hardhat-ethers plugin themselves. This is the
// ethers-typed type-extensions module, loaded only from the main and `/ethers` entry points;
// the neutral Hardhat config augmentations live in `type-extensions-config.ts`.
export type * from '@nomicfoundation/hardhat-ethers';

// Re-exported for backwards compatibility with importers of these config types.
export type { HardhatDefenderConfig, NamespacedCompileErrorsRule } from './type-extensions-config.js';

export type ContractTypeOfFactory<F extends ContractFactory> = ReturnType<F['attach']> & ReturnType<F['deploy']>;

declare module 'hardhat/types/hre' {
  export interface HardhatRuntimeEnvironment {
    upgrades: HardhatUpgrades;
    defender: DefenderHardhatUpgrades;

    // Internal caching properties (not part of public API)
    _upgrades?: HardhatUpgrades;
    _defender?: DefenderHardhatUpgrades;
  }
}

export {};
