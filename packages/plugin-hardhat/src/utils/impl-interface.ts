import { DeploymentNotFound, Manifest } from '@openzeppelin/upgrades-core';
import { utils } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Gets the implementation interface from the manifest.
 *
 * @returns a Promise with the interface, or undefined the implementation interface cannot be found in the manifest.
 */
export async function getInterfaceFromManifest(
  hre: HardhatRuntimeEnvironment,
  implAddress: string,
): Promise<utils.Interface | undefined> {
  const { provider } = hre.network;
  const manifest = await Manifest.forNetwork(provider);
  try {
    const implDeployment = await manifest.getDeploymentFromAddress(implAddress);
    if (implDeployment.abi === undefined) {
      return undefined;
    }
    return new utils.Interface(implDeployment.abi);
  } catch (e: any) {
    if (e instanceof DeploymentNotFound) {
      return undefined;
    } else {
      throw e;
    }
  }
}
