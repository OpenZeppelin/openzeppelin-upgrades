import {
  getImplementationAddressFromProxy,
  LoadProxyUnsupportedError,
  UpgradesError,
} from '@openzeppelin/upgrades-core';

import { ContractInstance, wrapProvider, withDefaults, ContractAddressOrInstance, getContractAddress } from './utils';
import { getInterfaceFromManifest } from './utils/impl-interface';

export async function loadProxy(proxy: ContractAddressOrInstance): Promise<ContractInstance> {
  const { deployer } = withDefaults();
  const provider = wrapProvider(deployer.provider);

  const proxyAddress = getContractAddress(proxy);

  const implAddress = await getImplementationAddressFromProxy(provider, proxyAddress);
  if (implAddress === undefined) {
    throw new LoadProxyUnsupportedError(proxyAddress);
  }

  const contractInterface = await getInterfaceFromManifest(provider, implAddress);
  if (contractInterface === undefined) {
    throw new UpgradesError(
      `Implementation ${implAddress} was not found in the network manifest.`,
      () =>
        `Create an instance of the implementation contract at the proxy address instead. For example, if your Truffle contract object is called MyContract, use MyContract.at(${proxyAddress})`,
    );
  }

  return contractInterface.at(proxyAddress);
}
