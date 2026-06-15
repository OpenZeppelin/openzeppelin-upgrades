import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { Address } from 'viem';

import { deployUpgradeableImpl } from '../engine/deploy-impl.js';
import type { DeployImplementationOptions } from './options.js';
import { asAddress, getContractInfo, makeBinding } from './utils.js';

export type DeployImplementationFunction = (
  contractName: StringWithArtifactContractNamesAutocompletion,
  opts?: DeployImplementationOptions,
) => Promise<Address>;

export function makeDeployImplementation(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): DeployImplementationFunction {
  return async function deployImplementation(
    contractName: StringWithArtifactContractNamesAutocompletion,
    opts: DeployImplementationOptions = {},
  ): Promise<Address> {
    const binding = await makeBinding(hre, connection, opts);
    const implInfo = await getContractInfo(hre, contractName, opts.libraries);
    const deployed = await deployUpgradeableImpl(binding, implInfo, opts, undefined);
    return asAddress(deployed.impl);
  };
}
