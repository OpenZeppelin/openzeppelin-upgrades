import {
  DeploymentNotFound,
  EIP1967BeaconNotFound,
  EIP1967ImplementationNotFound,
  getBeaconAddress,
  getImplementationAddress,
  Manifest,
} from '@openzeppelin/upgrades-core';
import { utils } from 'ethers';
import { EthereumProvider, HardhatRuntimeEnvironment } from 'hardhat/types';
import { getIBeaconFactory } from '.';

/**
 * Gets the implementation address from a Beacon.
 *
 * @returns the implementation address.
 */
export async function getImplementationAddressFromBeacon(hre: HardhatRuntimeEnvironment, beaconAddress: string) {
  const IBeaconFactory = await getIBeaconFactory(hre);
  const beaconContract = IBeaconFactory.attach(beaconAddress);
  const currentImplAddress = await beaconContract.implementation();
  return currentImplAddress;
}

/**
 * Checks if the address looks like a beacon.
 *
 * @returns true if the address has an implementation() function that returns an address, false otherwise.
 */
export async function isBeacon(hre: HardhatRuntimeEnvironment, beaconAddress: string) {
  try {
    return hre.ethers.utils.isAddress(await getImplementationAddressFromBeacon(hre, beaconAddress));
  } catch (e: any) {
    if (e.message.includes('function selector was not recognized') || e.message.includes('call revert exception')) {
      return false;
    } else {
      throw e;
    }
  }
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
): Promise<string | undefined> {
  try {
    return await getImplementationAddress(provider, proxyAddress);
  } catch (e: any) {
    if (e instanceof EIP1967ImplementationNotFound) {
      try {
        const beaconAddress = await getBeaconAddress(provider, proxyAddress);
        return await getImplementationAddressFromBeacon(hre, beaconAddress);
      } catch (e: any) {
        if (e instanceof EIP1967BeaconNotFound) {
          return undefined;
        } else {
          throw e;
        }
      }
    } else {
      throw e;
    }
  }
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
    } else {
      throw e;
    }
  }
}
