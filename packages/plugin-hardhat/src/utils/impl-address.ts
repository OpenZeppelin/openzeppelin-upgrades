import { DeploymentNotFound, getBeaconAddress, getImplementationAddress, Manifest } from '@openzeppelin/upgrades-core';
import { Contract, ethers, Signer, utils } from 'ethers';
import { EthereumProvider, HardhatRuntimeEnvironment } from 'hardhat/types';
import { ContractAddressOrInstance, getIBeaconFactory } from '.';

/**
 * Gets the implementation address from a Beacon.
 *
 * @returns the implementation address.
 */
export async function getImplementationAddressFromBeacon(
  hre: HardhatRuntimeEnvironment,
  signer: ethers.Signer | undefined,
  beaconAddress: string,
) {
  const IBeaconFactory = await getIBeaconFactory(hre, signer);
  const beaconContract = IBeaconFactory.attach(beaconAddress);
  const currentImplAddress = await beaconContract.implementation();
  return currentImplAddress;
}

/**
 * Gets the implementation address from a UUPS/Transparent/Beacon proxy.
 *
 * @returns a Promise with the implementation address, or undefined if a UUPS/Transparent/Beacon proxy is not located at the address.
 */
export async function getImplementationAddressFromProxy(
  provider: EthereumProvider,
  proxyAddress: string,
  hre: HardhatRuntimeEnvironment,
  proxy: Contract | ContractAddressOrInstance,
  signer: Signer | undefined,
) {
  let result: string | undefined;
  try {
    result = await getImplementationAddress(provider, proxyAddress);
  } catch (e: any) {
    try {
      const beaconAddress = await getBeaconAddress(provider, proxyAddress);
      result = await getImplementationAddressFromBeacon(
        hre,
        proxy instanceof Contract ? proxy.signer : signer,
        beaconAddress,
      );
    } catch (e: any) {
      // error expected if the address was not a beacon proxy
    }
  }
  return result;
}

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
    }
    // otherwise rethrow due to some other error
    throw e;
  }
}
