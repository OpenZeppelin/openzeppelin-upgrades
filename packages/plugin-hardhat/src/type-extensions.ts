import 'hardhat/types/runtime';
import 'hardhat/types/config';

import type { HardhatUpgrades, DefenderHardhatUpgrades } from '.';

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

export type NamespacedCompileFailureRule = 'error' | 'warn' | 'ignore';

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    defender?: HardhatDefenderConfig;
    namespacedCompileFailure?: NamespacedCompileFailureRule;
  }

  export interface HardhatConfig {
    defender?: HardhatDefenderConfig;
    namespacedCompileFailure?: NamespacedCompileFailureRule;
  }
}
