import { Interface, TransactionResponse } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getChainId } from '@openzeppelin/upgrades-core';
import { MetaTransactionData, OperationType } from '@safe-global/safe-core-sdk-types';
import { proposeSafeTx, waitUntilSignedAndExecuted } from './deploy';
import { UpgradeProxyOptions } from '../utils';

export async function safeGlobalUpgradeToAndCallV5(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeProxyOptions,
  proxyAddress: string,
  nextImpl: string,
  call: string,
): Promise<TransactionResponse> {
  console.log(`Sending upgradeToAndCall tx to proxy:${proxyAddress} with nextImpl:${nextImpl} and call:${call}`);
  const iface = new Interface(['function upgradeToAndCall(address newImplementation, bytes memory data)']);
  const callData = iface.encodeFunctionData('upgradeToAndCall', [nextImpl, call]);
  const deployTxHash = await proposeAndWaitForSafeTx(hre, opts, proxyAddress, callData);

  const tx = await hre.ethers.provider.getTransaction(deployTxHash);
  return tx ?? getNullTransactionResponse(hre);
}

export async function safeGlobalUpgradeToV4(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeProxyOptions,
  proxyAddress: string,
  nextImpl: string,
): Promise<TransactionResponse> {
  console.log(`Sending upgradeTo tx to proxy:${proxyAddress} with nextImpl:${nextImpl}`);
  const iface = new Interface(['function upgradeTo(address newImplementation)']);
  const callData = iface.encodeFunctionData('upgradeTo', [nextImpl]);
  const deployTxHash = await proposeAndWaitForSafeTx(hre, opts, proxyAddress, callData);

  const tx = await hre.ethers.provider.getTransaction(deployTxHash);
  return tx ?? getNullTransactionResponse(hre);
}

export async function safeGlobalUpgradeToAndCallV4(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeProxyOptions,
  proxyAddress: string,
  nextImpl: string,
  call: string,
): Promise<TransactionResponse> {
  return safeGlobalUpgradeToAndCallV5(hre, opts, proxyAddress, nextImpl, call);
}

export async function safeGlobalAdminUpgradeAndCallV5(
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

export async function safeGlobalAdminUpgradeV4(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeProxyOptions,
  adminAddress: string,
  proxyAddress: string,
  nextImpl: string,
): Promise<TransactionResponse> {
  console.log(`Sending upgrade tx to ${adminAddress} with proxy:${proxyAddress} nextImpl:${nextImpl}`);
  const iface = new Interface(['function upgrade(address proxy, address implementation)']);
  const upgradeData = iface.encodeFunctionData('upgrade', [proxyAddress, nextImpl]);
  const deployTxHash = await proposeAndWaitForSafeTx(hre, opts, adminAddress, upgradeData);

  const tx = await hre.ethers.provider.getTransaction(deployTxHash);
  return tx ?? getNullTransactionResponse(hre);
}

export async function safeGlobalAdminUpgradeAndCallV4(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeProxyOptions,
  adminAddress: string,
  proxyAddress: string,
  nextImpl: string,
  call: string,
): Promise<TransactionResponse> {
  return safeGlobalAdminUpgradeAndCallV5(hre, opts, adminAddress, proxyAddress, nextImpl, call);
}

export async function safeGlobalBeaconUpgradeTo(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeProxyOptions,
  beaconAddress: string,
  nextImpl: string,
): Promise<TransactionResponse> {
  console.log(`Sending upgradeTo tx to beacon:${beaconAddress} with nextImpl:${nextImpl}`);
  const iface = new Interface(['function upgradeTo(address newImplementation)']);
  const callData = iface.encodeFunctionData('upgradeTo', [nextImpl]);
  const deployTxHash = await proposeAndWaitForSafeTx(hre, opts, beaconAddress, callData);

  const tx = await hre.ethers.provider.getTransaction(deployTxHash);
  return tx ?? getNullTransactionResponse(hre);
}

export async function proposeAndWaitForSafeTx(
  hre: HardhatRuntimeEnvironment,
  opts: UpgradeProxyOptions,
  to: string,
  callData: string,
) {
  const metaTxData: MetaTransactionData = {
    to,
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

export async function getNullTransactionResponse(hre: HardhatRuntimeEnvironment): Promise<TransactionResponse> {
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
