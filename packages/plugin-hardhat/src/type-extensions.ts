import 'hardhat/types/runtime';

import type { HardhatUpgrades, PlatformHardhatUpgrades } from '.';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    upgrades: HardhatUpgrades;
    platform: PlatformHardhatUpgrades;
  }
}

export interface HardhatPlatformConfig {
  apiKey: string;
  apiSecret: string;
  useDeploy?: boolean;
}

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    platform?: HardhatPlatformConfig;
  }

  export interface HardhatConfig {
    platform?: HardhatPlatformConfig;
  }
}
