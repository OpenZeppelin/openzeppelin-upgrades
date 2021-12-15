import { getImplementationAddressFromBeacon } from '.';
import { InvalidBeaconImplementation } from './impl-address';
import { EthereumProvider } from './provider';

/**
 * Checks if the address looks like a beacon.
 *
 * @returns true if the address has an implementation() function that returns an address, false otherwise.
 */
export async function isBeacon(provider: EthereumProvider, beaconAddress: string) {
  try {
    return await getImplementationAddressFromBeacon(provider, beaconAddress);
  } catch (e: any) {
    if (e.message.includes('function selector was not recognized') || e instanceof InvalidBeaconImplementation) {
      return false;
    } else {
      throw e;
    }
  }
}
