import '@nomiclabs/buidler/types';

import type { DeployFunction } from './deploy-proxy';
import type { UpgradeFunction, PrepareUpgradeFunction } from './upgrade-proxy';

declare module '@nomiclabs/buidler/types' {
  export interface BuidlerRuntimeEnvironment {
    upgrades: {
      deployProxy: DeployFunction;
      upgradeProxy: UpgradeFunction;
      prepareUpgrade: PrepareUpgradeFunction;
    };
  }
}
