import 'hardhat/types/runtime';
import 'hardhat/types/config';

import type { HardhatDefenderConfig, HardhatDefender } from '.';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    defender: HardhatDefender;
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
