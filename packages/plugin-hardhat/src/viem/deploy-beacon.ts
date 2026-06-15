import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';

import { deployBeacon as engineDeployBeacon } from '../engine/deploy-beacon.js';
import type { DeployBeaconOptions } from './options.js';
import { getUpgradeableBeaconContract, UpgradeableBeaconContract } from './upgradeable-beacon.js';
import { asAddress, getContractInfo, makeBinding } from './utils.js';

export type DeployBeaconFunction = (
  contractName: StringWithArtifactContractNamesAutocompletion,
  opts?: DeployBeaconOptions,
) => Promise<UpgradeableBeaconContract>;

export function makeDeployBeacon(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): DeployBeaconFunction {
  return async function deployBeacon(
    contractName: StringWithArtifactContractNamesAutocompletion,
    opts: DeployBeaconOptions = {},
  ): Promise<UpgradeableBeaconContract> {
    const binding = await makeBinding(hre, connection, opts);
    const implInfo = await getContractInfo(hre, contractName, opts.libraries);
    const beaconDeployment = await engineDeployBeacon(binding, implInfo, opts);

    return getUpgradeableBeaconContract(connection, asAddress(beaconDeployment.address), opts.client);
  };
}
