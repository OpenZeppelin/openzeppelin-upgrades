import {
  EIP1967BeaconNotFound,
  EIP1967ImplementationNotFound,
  getBeaconAddress,
  getImplementationAddress,
} from './eip-1967';
import { EthereumProvider } from './provider';

export async function isTransparentOrUUPSProxy(
  provider: EthereumProvider,
  proxyOrBeaconAddress: string,
): Promise<boolean> {
  try {
    await getImplementationAddress(provider, proxyOrBeaconAddress);
    // if an exception was not encountered above, then this address is a transparent/uups proxy
    return true;
  } catch (e: any) {
    if (e instanceof EIP1967ImplementationNotFound) {
      return false;
    } else {
      throw e;
    }
  }
}

export async function isBeaconProxy(provider: EthereumProvider, proxyOrBeaconAddress: string): Promise<boolean> {
  try {
    await getBeaconAddress(provider, proxyOrBeaconAddress);
    // if an exception was not encountered above, then this address is a beacon proxy
    return true;
  } catch (e: any) {
    if (e instanceof EIP1967BeaconNotFound) {
      return false;
    } else {
      throw e;
    }
  }
}
