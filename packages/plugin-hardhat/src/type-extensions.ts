import 'hardhat/types/runtime';

import type { HardhatUpgrades } from '.';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    upgrades: HardhatUpgrades;
  }
}
