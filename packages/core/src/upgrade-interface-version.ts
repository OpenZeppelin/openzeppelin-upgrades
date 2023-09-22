import { callOptionalSelector } from './call-optional-selector';
import { EthereumProvider } from './provider';

import { AbiCoder } from 'ethers';

export async function getUpgradeInterfaceVersion(
  provider: EthereumProvider,
  address: string,
): Promise<string | undefined> {
  const version = await callOptionalSelector(provider, address, 'UPGRADE_INTERFACE_VERSION()');
  if (version !== undefined) {
    const abiCoder = new AbiCoder();
    const decodedVersion = abiCoder.decode(['string'], version);
    return decodedVersion[0];
  } else {
    return undefined;
  }
}
