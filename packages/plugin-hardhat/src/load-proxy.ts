import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Contract, Signer } from 'ethers';

import {
  ContractAddressOrInstance,
  getContractAddress,
  getImplementationAddressFromProxy,
  getInterfaceFromManifest,
} from './utils';
import { UpgradesError } from '@openzeppelin/upgrades-core';

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

    const implAddress = await getImplementationAddressFromProxy(provider, proxyAddress, hre);
    if (implAddress === undefined) {
      throw new UpgradesError(
        `Contract at address ${proxyAddress} doesn't look like an ERC 1967 proxy or beacon proxy.`,
        () => 'Only transparent, uups, or beacon proxies can be loaded with the loadProxy() function.',
      );
    }

    const contractInterface = await getInterfaceFromManifest(hre, implAddress);
    if (contractInterface === undefined) {
      throw new UpgradesError(
        'Implementation at address ${implAddress} was not found in the network manifest.',
        () => `Use the implementation's contract factory to attach to the proxy address ${proxyAddress} instead.`,
      );
    }

    if (signer === undefined && proxy instanceof Contract) {
      signer = proxy.signer;
    }
    return new Contract(proxyAddress, contractInterface, signer);
  };
}
