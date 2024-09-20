import { callOptionalSignature } from './call-optional-signature';
import { EthereumProvider } from './provider';
import { parseAddress } from './utils/address';

/**
 * Infers whether the address might be a ProxyAdmin contract, by checking if it has an owner() function that returns an address.
 * @param provider Ethereum provider
 * @param possibleContractAddress The address to check
 * @returns true if the address might be a ProxyAdmin contract, false otherwise
 */
export async function inferProxyAdmin(provider: EthereumProvider, possibleContractAddress: string): Promise<boolean> {
  const owner = await callOptionalSignature(provider, possibleContractAddress, 'owner()');
  return owner !== undefined && parseAddress(owner) !== undefined;
}
