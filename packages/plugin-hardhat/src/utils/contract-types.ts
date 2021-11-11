import { ContractFactory, Signer } from 'ethers';

export type ContractAddressOrInstance = string | { address: string };
export type ContractFactoryOrSigner = ContractFactory | Signer;

export function getContractAddress(addressOrInstance: ContractAddressOrInstance): string {
  if (typeof addressOrInstance === 'string') {
    return addressOrInstance;
  } else {
    return addressOrInstance.address;
  }
}

export function getSigner(ImplFactoryOrSigner: ContractFactoryOrSigner) {
  return ImplFactoryOrSigner instanceof ContractFactory ? ImplFactoryOrSigner.signer : ImplFactoryOrSigner;
}
