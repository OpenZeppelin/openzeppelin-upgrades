import 'hardhat/types/runtime';
import 'hardhat/types/config';

import type { HardhatDefenderConfig, HardhatDefenderUpgrades } from '.';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    defender: HardhatDefenderUpgrades;
  }
}

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    defender?: HardhatDefenderConfig;
  }

  export interface HardhatConfig {
    defender?: HardhatDefenderConfig;
  }
}
