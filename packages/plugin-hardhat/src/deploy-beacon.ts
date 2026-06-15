import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { ContractFactory, Contract } from 'ethers';

import { DeployBeaconOptions, getUpgradeableBeaconFactory } from './utils/index.js';
import { disableDefender } from './defender/utils.js';
import { attach, getSigner } from './utils/ethers.js';
import { makeEthersBinding, contractInfo } from './ethers-binding.js';
import { deployBeacon as engineDeployBeacon } from './engine/deploy-beacon.js';

export interface DeployBeaconFunction {
  (ImplFactory: ContractFactory, opts?: DeployBeaconOptions): Promise<Contract>;
}

export function makeDeployBeacon(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
  connection: NetworkConnection,
): DeployBeaconFunction {
  return async function deployBeacon(ImplFactory: ContractFactory, opts: DeployBeaconOptions = {}) {
    disableDefender(hre, defenderModule, opts, deployBeacon.name);

    const binding = makeEthersBinding(hre, connection, ImplFactory.runner, opts);
    const beaconDeployment = await engineDeployBeacon(binding, contractInfo(ImplFactory), opts);

    const signer = getSigner(ImplFactory.runner);
    const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(connection, signer);
    const beaconContract = attach(UpgradeableBeaconFactory, beaconDeployment.address);

    // @ts-ignore Won't be readonly because beaconContract was created through attach.
    beaconContract.deployTransaction = beaconDeployment.deployTransaction;
    return beaconContract;
  };
}
