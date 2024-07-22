import { Interface, TransactionResponse } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getChainId } from '@openzeppelin/upgrades-core';
import { MetaTransactionData, OperationType } from '@safe-global/safe-core-sdk-types';
import { proposeSafeTx, waitUntilSignedAndExecuted } from './deploy';
import { UpgradeProxyOptions } from '../utils';

export async function safeGlobalAdminUpgradeAndCall(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeProxyOptions,
  adminAddress: string,
  proxyAddress: string,
  nextImpl: string,
  call: string,
): Promise<TransactionResponse> {
  console.log(
    `Sending upgradeAndCall tx to ${adminAddress} with proxy:${proxyAddress} nextImpl:${nextImpl} and call:${call}`,
  );
  const iface = new Interface(['function upgradeAndCall(address proxy, address implementation, bytes memory data)']);
  const upgradeAndCallData = iface.encodeFunctionData('upgradeAndCall', [proxyAddress, nextImpl, call]);
  const deployTxHash = await proposeAndWaitForSafeTx(hre, opts, adminAddress, upgradeAndCallData);

  const tx = await hre.ethers.provider.getTransaction(deployTxHash);
  return tx ?? getNullTransactionResponse(hre);
}

async function proposeAndWaitForSafeTx(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeProxyOptions,
  adminAddress: string,
  callData: string,
) {
  const metaTxData: MetaTransactionData = {
    to: adminAddress,
    data: callData,
    value: '0',
    operation: OperationType.Call,
  };

  const safeTxHash = await proposeSafeTx(hre, metaTxData, opts);
  console.log(`Safe tx hash: ${safeTxHash}`);
  return await waitUntilSignedAndExecuted(
    safeTxHash,
    hre.network.config.chainId ?? (await getChainId(hre.ethers.provider)),
    opts,
  );
}

async function getNullTransactionResponse(hre: HardhatRuntimeEnvironment): Promise<TransactionResponse> {
  return new TransactionResponse(
    {
      blockNumber: 0,
      blockHash: '',
      hash: '',
      index: 0,
      from: '',
      to: '',
      data: '',
      value: BigInt(0),
      gasLimit: BigInt(0),
      gasPrice: BigInt(0),
      nonce: 0,
      chainId: BigInt(hre.network.config.chainId ?? (await getChainId(hre.ethers.provider))),
      type: 0,
      maxPriorityFeePerGas: BigInt(0),
      maxFeePerGas: BigInt(0),
      signature: new hre.ethers.Signature('', '', '', 28),
      accessList: [],
    },
    hre.ethers.provider,
  );
}
