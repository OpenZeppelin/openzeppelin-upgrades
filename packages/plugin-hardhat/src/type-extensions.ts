import 'hardhat/types/runtime';
import 'hardhat/types/config';

import type { HardhatUpgrades, DefenderHardhatUpgrades } from '.';
import { ContractFactory } from 'ethers';

export type ContractTypeOfFactory<F extends ContractFactory> = ReturnType<F['attach']> & ReturnType<F['deploy']>;

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    upgrades: HardhatUpgrades;
    defender: DefenderHardhatUpgrades;
  }
}

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
