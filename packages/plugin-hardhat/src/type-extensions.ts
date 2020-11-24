import 'hardhat/types/runtime';

import type { silenceWarnings } from '@openzeppelin/upgrades-core';
import type { DeployFunction } from './deploy-proxy';
import type { UpgradeFunction, PrepareUpgradeFunction } from './upgrade-proxy';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    upgrades: {
      deployProxy: DeployFunction;
      upgradeProxy: UpgradeFunction;
      prepareUpgrade: PrepareUpgradeFunction;
      silenceWarnings: typeof silenceWarnings;
    };
  }
}
