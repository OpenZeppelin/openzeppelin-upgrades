import 'hardhat/types/config';
import 'hardhat/types/hre';
import type { HardhatUpgrades, DefenderHardhatUpgrades } from './types.js';
import type { ContractFactory } from 'ethers';

export type ContractTypeOfFactory<F extends ContractFactory> = ReturnType<F['attach']> & ReturnType<F['deploy']>;

export interface HardhatDefenderConfig {
  apiKey: string;
  apiSecret: string;
  useDefenderDeploy?: boolean;
  network?: string;
}

export type NamespacedCompileErrorsRule = 'error' | 'warn' | 'ignore';

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    defender?: HardhatDefenderConfig;
    namespacedCompileErrors?: NamespacedCompileErrorsRule;
  }

  export interface HardhatConfig {
    defender?: HardhatDefenderConfig;
    namespacedCompileErrors?: NamespacedCompileErrorsRule;
  }
}

declare module 'hardhat/types/hre' {
  export interface HardhatRuntimeEnvironment {
    upgrades: HardhatUpgrades;
    defender: DefenderHardhatUpgrades;

    // Internal caching properties (not part of public API)
    _upgrades?: HardhatUpgrades;
    _defender?: DefenderHardhatUpgrades;
  }
}
