import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import { Deployment } from '@openzeppelin/upgrades-core';

import { DeployBeaconOptions, deploy, DeployTransaction, getUpgradeableBeaconFactory, deployBeaconImpl } from './utils';

export interface DeployBeaconFunction {
  (ImplFactory: ContractFactory, opts?: DeployBeaconOptions): Promise<Contract>;
}

export function makeDeployBeacon(hre: HardhatRuntimeEnvironment): DeployBeaconFunction {
  return async function deployBeacon(ImplFactory: ContractFactory, opts: DeployBeaconOptions = {}) {
    const { impl } = await deployBeaconImpl(hre, ImplFactory, opts);

    const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(hre, ImplFactory.signer);
    const beaconDeployment: Required<Deployment & DeployTransaction> = await deploy(UpgradeableBeaconFactory, impl);
    const beaconContract = UpgradeableBeaconFactory.attach(beaconDeployment.address);

    // @ts-ignore Won't be readonly because beaconContract was created through attach.
    beaconContract.deployTransaction = beaconDeployment.deployTransaction;
    return beaconContract;
  };
}
