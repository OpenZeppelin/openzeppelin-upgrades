import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Contract, Signer } from 'ethers';

import { ContractAddressOrInstance, getContractAddress } from './utils';
import { getImplementationAddressFromProxy, getInterfaceFromManifest } from './utils/impl-address';

export interface LoadProxyFunction {
  (proxy: Contract, signer?: Signer): Promise<Contract>;
  (proxy: ContractAddressOrInstance, signer: Signer): Promise<Contract>;
}

export function makeLoadProxy(hre: HardhatRuntimeEnvironment): LoadProxyFunction {
  return async function loadProxy(proxy: ContractAddressOrInstance | Contract, signer?: Signer) {
    const { provider } = hre.network;

    if (!(proxy instanceof Contract) && signer === undefined) {
      throw new Error('loadProxy() must be called with a contract instance or both a contract address and a signer.');
    }

    const proxyAddress = getContractAddress(proxy);

    const implAddress = await getImplementationAddressFromProxy(provider, proxyAddress, hre, proxy, signer);
    if (implAddress === undefined) {
      throw new Error(`Contract at address ${proxyAddress} doesn't look like an ERC 1967 proxy or beacon proxy.`);
    }

    const contractInterface = await getInterfaceFromManifest(hre, implAddress);
    if (contractInterface === undefined) {
      throw new Error(
        `Implementation at address ${implAddress} was not found in the network manifest. Use the implementation's contract factory to attach to the proxy address ${proxyAddress} instead.`,
      );
    }

    if (signer === undefined && proxy instanceof Contract) {
      signer = proxy.signer;
    }
    return new Contract(proxyAddress, contractInterface, signer);
  };
}
