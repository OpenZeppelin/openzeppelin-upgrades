export type ContractAddressOrInstance = string | { address: string };

export function getContractAddress(addressOrInstance: ContractAddressOrInstance): string {
  if (typeof addressOrInstance === 'string') {
    return addressOrInstance;
  } else {
    return addressOrInstance.address;
  }
}
