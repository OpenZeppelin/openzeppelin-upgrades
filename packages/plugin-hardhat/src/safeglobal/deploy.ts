import { type ContractFactory, Interface, id, toBigInt, TransactionResponse, TransactionReceipt } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { Deployment, getChainId, RemoteDeploymentId } from '@openzeppelin/upgrades-core';
import { MetaTransactionData, OperationType } from '@safe-global/safe-core-sdk-types';
import SafeApiKit from '@safe-global/api-kit';
import Safe from '@safe-global/protocol-kit';

import CreateCall from '@openzeppelin/upgrades-core/artifacts/contracts/CreateCall.sol/CreateCall.json';

import { DeployTransaction, UpgradeOptions, EthersDeployOptions, SafeGlobalDeployOptions } from '../utils';

export async function safeGlobalDeploy(
  hre: HardhatRuntimeEnvironment,
  factory: ContractFactory,
  opts: UpgradeOptions & EthersDeployOptions & SafeGlobalDeployOptions,
  ...args: unknown[]
): Promise<Required<Deployment & DeployTransaction> & RemoteDeploymentId> {
  const tx = await factory.getDeployTransaction(...args);
  const chainId = hre.network.config.chainId ?? (await getChainId(hre.network.provider));

  // create performCreate2Tx
  const create2Data = await getPerformCreate2Data(tx.data, opts);
  console.log('Proposing multisig deployment tx and waiting for contract to be deployed...');
  const deployTxHash = await proposeAndWaitForSafeTx(hre, create2Data, chainId, opts);
  const [address, txResponse] = await getCreate2DeployedContractAddress(hre, deployTxHash);

  const deployTransaction = txResponse;
  if (deployTransaction === null) {
    throw new Error('Broken invariant: deploymentTransaction is null');
  }

  const txHash = deployTransaction.hash;

  return {
    address,
    txHash,
    deployTransaction,
  };
}

async function getPerformCreate2Data(
  deployData: string,
  opts: UpgradeOptions & EthersDeployOptions & SafeGlobalDeployOptions,
): Promise<string> {
  if (opts.salt === undefined || opts.salt === '' || opts.salt.trim() === '') {
    throw new Error('Salt must be provided for create2 deployment');
  }
  const iface = new Interface(CreateCall.abi);
  const performCreate2Data = iface.encodeFunctionData('performCreate2', [0, deployData, id(opts.salt)]);
  return performCreate2Data;
}

async function proposeAndWaitForSafeTx(
  hre: HardhatRuntimeEnvironment,
  performCreate2Data: string,
  chainId: number,
  opts: UpgradeOptions & EthersDeployOptions & SafeGlobalDeployOptions,
) {
  if (opts.createCallAddress === undefined || opts.createCallAddress === '') {
    throw new Error('CreateCall address must be provided for create2 deployment');
  }
  const performCreate2MetaTxData: MetaTransactionData = {
    to: opts.createCallAddress,
    data: performCreate2Data,
    value: '0',
    operation: OperationType.Call,
  };

  const safeTxHash = await proposeSafeTx(hre, performCreate2MetaTxData, chainId, opts);
  console.log(`Safe tx hash: ${safeTxHash}`);
  return await waitUntilSignedAndExecuted(safeTxHash, chainId, opts);
}

async function proposeSafeTx(
  hre: HardhatRuntimeEnvironment,
  txData: MetaTransactionData,
  chainId: number,
  opts: UpgradeOptions & EthersDeployOptions & SafeGlobalDeployOptions,
) {
  const apiKit = new SafeApiKit({
    chainId: toBigInt(chainId),
    txServiceUrl: opts.txServiceUrl,
  });

  const protocolKitOwner1 = await Safe.init({
    provider: hre.network.provider,
    signer: process.env.SIGNER,
    safeAddress: opts.safeAddress ?? '',
    contractNetworks: {
      [chainId]: {
        safeSingletonAddress: opts.safeSingletonAddress ?? '',
        safeProxyFactoryAddress: opts.safeProxyFactoryAddress ?? '',
        multiSendAddress: opts.multiSendAddress ?? '',
        multiSendCallOnlyAddress: opts.multiSendCallOnlyAddress ?? '',
        fallbackHandlerAddress: opts.fallbackHandlerAddress ?? '',
        signMessageLibAddress: opts.signMessageLibAddress ?? '',
        createCallAddress: opts.createCallAddress ?? '',
        simulateTxAccessorAddress: opts.simulateTxAccessorAddress ?? '',
      },
    },
  });

  const safeAddress = await protocolKitOwner1.getAddress();

  // Sign and send the transaction
  // Create a Safe transaction with the provided parameters
  const safeTransaction = await protocolKitOwner1.createTransaction({ transactions: [txData] });

  const safeTxHash = await protocolKitOwner1.getTransactionHash(safeTransaction);

  const senderSignature = await protocolKitOwner1.signHash(safeTxHash);

  await apiKit.proposeTransaction({
    safeAddress,
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress: '0x25843121E84f6E52a140885986FD890d302c34EE',
    senderSignature: senderSignature.data,
  });

  return safeTxHash;
}

async function waitUntilSignedAndExecuted(
  safeTxHash: string,
  chainId: number,
  opts: UpgradeOptions & EthersDeployOptions & SafeGlobalDeployOptions,
) {
  const apiKit = new SafeApiKit({
    chainId: toBigInt(chainId),
    txServiceUrl: opts.txServiceUrl,
  });

  const safeTx = await apiKit.getTransaction(safeTxHash);
  if (safeTx.isExecuted) {
    return safeTx.transactionHash;
  }

  return new Promise<string>(resolve => {
    const interval = setInterval(async () => {
      const safeTx = await apiKit.getTransaction(safeTxHash);
      if (safeTx.isExecuted) {
        clearInterval(interval);
        resolve(safeTx.transactionHash);
      }
    }, 1000);
  });
}

async function getCreate2DeployedContractAddress(
  hre: HardhatRuntimeEnvironment,
  txHash: string,
): Promise<[string, TransactionResponse | null, TransactionReceipt | null]> {
  const iface = new Interface(CreateCall.abi);
  const provider = hre.ethers.provider;
  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);

  if (receipt === null) {
    console.log('Transaction not found or not yet mined.');
    return ['', tx, receipt];
  }

  // Parse logs
  for (const log of receipt.logs) {
    try {
      const parsedLog = iface.parseLog(log);
      if (parsedLog?.name === 'ContractCreation') {
        console.log(`Event: ${parsedLog?.name}`);
        console.log(`New Contract: ${parsedLog?.args.newContract}`);
        return [parsedLog?.args.newContract, tx, receipt];
      }
    } catch (error) {
      console.error('Error parsing log:', error);
    }
  }
  return ['', tx, receipt];
}
