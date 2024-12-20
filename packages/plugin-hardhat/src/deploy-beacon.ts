import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import { Deployment } from '@openzeppelin/upgrades-core';

import { DeployBeaconOptions, deploy, DeployTransaction, getUpgradeableBeaconFactory, deployBeaconImpl } from './utils';
import { disableDefender } from './defender/utils';
import { attach, getSigner } from './utils/ethers';
import { getInitialOwner } from './utils/initial-owner';

export interface DeployBeaconFunction {
  (ImplFactory: ContractFactory, opts?: DeployBeaconOptions): Promise<Contract>;
}

export function makeDeployBeacon(hre: HardhatRuntimeEnvironment, defenderModule: boolean): DeployBeaconFunction {
  return async function deployBeacon(ImplFactory: ContractFactory, opts: DeployBeaconOptions = {}) {
    disableDefender(hre, defenderModule, opts, deployBeacon.name);

    const { impl } = await deployBeaconImpl(hre, ImplFactory, opts);

    const signer = getSigner(ImplFactory.runner);
    const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(hre, signer);

    const initialOwner = await getInitialOwner(opts, signer);

    const beaconDeployment: Deployment & DeployTransaction = await deploy(
      hre,
      opts,
      UpgradeableBeaconFactory,
      impl,
      initialOwner,
    );
    const beaconContract = attach(UpgradeableBeaconFactory, beaconDeployment.address);

    // @ts-ignore Won't be readonly because beaconContract was created through attach.
    beaconContract.deployTransaction = beaconDeployment.deployTransaction;
    return beaconContract;
  };
}
