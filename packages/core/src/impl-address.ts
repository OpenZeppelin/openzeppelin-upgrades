import { keccak256 } from 'ethereumjs-util';
import {
  call,
  EIP1967BeaconNotFound,
  EIP1967ImplementationNotFound,
  getBeaconAddress,
  getImplementationAddress,
  UpgradesError,
} from '.';

import { EthereumProvider } from './provider';
import { parseAddress } from './utils/address';

export class InvalidBeaconImplementation extends UpgradesError {}

/**
 * Gets the implementation address from the beacon using its implementation() function.
 * @param provider
 * @param beaconAddress
 * @returns The implementation address.
 * @throws {InvalidBeaconImplementation} If the implementation() function does not return an address.
 */
export async function getImplementationAddressFromBeacon(
  provider: EthereumProvider,
  beaconAddress: string,
): Promise<any> {
  const implementationFunction = '0x' + keccak256(Buffer.from('implementation()')).toString('hex').slice(0, 8);
  const implAddress = await call(provider, beaconAddress, implementationFunction);
  return parseBeaconImplAddress(beaconAddress, implAddress);
}

function parseBeaconImplAddress(beaconAddress: string, implAddress: string): string {
  const address = parseAddress(implAddress);
  if (address === undefined) {
    throw new InvalidBeaconImplementation(`Contract at ${beaconAddress} doesn't look like a beacon`);
  }
  return address;
}

/**
 * Gets the implementation address from a UUPS/Transparent/Beacon proxy.
 *
 * @returns a Promise with the implementation address, or undefined if a UUPS/Transparent/Beacon proxy is not located at the address.
 */
export async function getImplementationAddressFromProxy(
  provider: EthereumProvider,
  proxyAddress: string,
): Promise<string | undefined> {
  try {
    return await getImplementationAddress(provider, proxyAddress);
  } catch (e: any) {
    if (e instanceof EIP1967ImplementationNotFound) {
      try {
        const beaconAddress = await getBeaconAddress(provider, proxyAddress);
        return await getImplementationAddressFromBeacon(provider, beaconAddress);
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
