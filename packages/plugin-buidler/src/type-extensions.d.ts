import "@nomiclabs/buidler/types";
import type { ContractFactory, Contract } from 'ethers';
import { UpgradeFunction, DeployFunction } from './types';

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    upgrades: {
      deployProxy: DeployFunction;
      upgradeProxy: UpgradeFunction;
    };
  }
}
