import { InvalidBeacon, getImplementationAddressFromBeacon } from './impl-address';
import { EthereumProvider } from './provider';

/**
 * Checks if the address looks like a beacon.
 *
 * @returns Promise<true> if the address has an implementation() function that returns an address, Promise<false> otherwise.
 */
export async function isBeacon(provider: EthereumProvider, beaconAddress: string): Promise<boolean> {
  try {
    await getImplementationAddressFromBeacon(provider, beaconAddress);
    return true;
  } catch (e: any) {
    if (e instanceof InvalidBeacon) {
      return false;
    } else {
      throw e;
    }
  }
}
