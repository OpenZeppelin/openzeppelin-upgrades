import { Interface, TransactionResponse } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { UpgradeProxyOptions } from '../utils';
import { getNullTransactionResponse } from './upgrade';
import { proposeAndWaitForSafeTx } from './deploy';

export async function safeGlobalAdminChangeProxyAdminV4(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeProxyOptions,
  adminAddress: string,
  proxyAddress: string,
  newAdmin: string,
): Promise<TransactionResponse> {
  console.log(
    `Sending changeProxyAdmin tx to admin:${adminAddress} with proxy:${proxyAddress} and nextImpl:${newAdmin}`,
  );
  const iface = new Interface(['function changeProxyAdmin(address proxy, address newAdmin)']);
  const callData = iface.encodeFunctionData('changeProxyAdmin', [proxyAddress, newAdmin]);
  const deployTxHash = await proposeAndWaitForSafeTx(hre, opts, adminAddress, callData);

  const tx = await hre.ethers.provider.getTransaction(deployTxHash);
  return tx ?? getNullTransactionResponse(hre);
}

export async function safeGlobalAdminTransferOwnership(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeProxyOptions,
  adminAddress: string,
  newOwner: string,
): Promise<TransactionResponse> {
  console.log(`Sending transferOwnership tx to admin:${adminAddress} with newOwner:${newOwner}`);
  const iface = new Interface(['function transferOwnership(address newOwner)']);
  const callData = iface.encodeFunctionData('transferOwnership', [newOwner]);
  const deployTxHash = await proposeAndWaitForSafeTx(hre, opts, adminAddress, callData);

  const tx = await hre.ethers.provider.getTransaction(deployTxHash);
  return tx ?? getNullTransactionResponse(hre);
}
