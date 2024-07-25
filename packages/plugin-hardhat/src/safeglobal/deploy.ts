import { type ContractFactory, Interface, id, toBigInt, TransactionResponse, TransactionReceipt } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { Deployment, getChainId, RemoteDeploymentId } from '@openzeppelin/upgrades-core';
import { MetaTransactionData, OperationType } from '@safe-global/safe-core-sdk-types';
import SafeApiKit from '@safe-global/api-kit';
import Safe from '@safe-global/protocol-kit';

import { DeployTransaction, DeployProxyOptions } from '../utils';

export async function safeGlobalDeploy(
  hre: HardhatRuntimeEnvironment,
  factory: ContractFactory,
  opts: DeployProxyOptions,
  ...args: unknown[]
): Promise<Required<Deployment & DeployTransaction> & RemoteDeploymentId> {
  const tx = await factory.getDeployTransaction(...args);

  const create2Data = await getCreate2CallData(tx.data, opts);
  console.log('Proposing multisig deployment tx and waiting for contract to be deployed...');
  const deployTxHash = await proposeAndWaitForSafeTx(hre, opts, opts.createCallAddress ?? '', create2Data);
  console.log('Getting deployed contract address...');
  const [address, txResponse] = await getCreate2DeployedContractAddress(hre, deployTxHash);
  console.log(`Contract deployed at: ${address}`);

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

async function getCreate2CallData(deployData: string, opts: DeployProxyOptions): Promise<string> {
  if (opts.salt === undefined || opts.salt === '' || opts.salt.trim() === '') {
    throw new Error('Salt must be provided for create2 deployment');
  }
  const iface = new Interface(['function performCreate2(uint256 value, bytes deploymentData, bytes32 salt)']);
  const performCreate2Data = iface.encodeFunctionData('performCreate2', [0, deployData, id(opts.salt)]);
  return performCreate2Data;
}

export async function proposeAndWaitForSafeTx(
  hre: HardhatRuntimeEnvironment,
  opts: DeployProxyOptions,
  to: string,
  callData: string,
) {
  const metaTxData: MetaTransactionData = {
    to,
    data: callData,
    value: '0',
    operation: OperationType.Call,
  };

  const chainId = hre.network.config.chainId ?? (await getChainId(hre.network.provider));
  const apiKit = new SafeApiKit({
    chainId: toBigInt(chainId),
    txServiceUrl: opts.txServiceUrl ?? 'https://safe-transaction-mainnet.safe.global/api',
  });

  const protocolKitOwner1 = await Safe.init({
    provider: hre.network.provider,
    safeAddress: opts.safeAddress ?? '',
    contractNetworks: {
      [chainId]: {
        // default values set from: https://github.com/safe-global/safe-deployments/tree/main/src/assets/v1.4.1
        safeSingletonAddress: opts.safeSingletonAddress ?? '0x41675C099F32341bf84BFc5382aF534df5C7461a',
        safeProxyFactoryAddress: opts.safeProxyFactoryAddress ?? '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
        multiSendAddress: opts.multiSendAddress ?? '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526',
        multiSendCallOnlyAddress: opts.multiSendCallOnlyAddress ?? '0x9641d764fc13c8B624c04430C7356C1C7C8102e2',
        fallbackHandlerAddress: opts.fallbackHandlerAddress ?? '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99',
        signMessageLibAddress: opts.signMessageLibAddress ?? '0xd53cd0aB83D845Ac265BE939c57F53AD838012c9',
        createCallAddress: opts.createCallAddress ?? '0x9b35Af71d77eaf8d7e40252370304687390A1A52',
        simulateTxAccessorAddress: opts.simulateTxAccessorAddress ?? '0x3d4BA2E0884aa488718476ca2FB8Efc291A46199',
      },
    },
  });

  // Sign and send the transaction
  // Create a Safe transaction with the provided parameters
  const safeTransaction = await protocolKitOwner1.createTransaction({ transactions: [metaTxData] });
  const safeTxHash = await protocolKitOwner1.getTransactionHash(safeTransaction);
  console.log(`Safe tx hash: ${safeTxHash}`);
  const senderSignature = await protocolKitOwner1.signHash(safeTxHash);

  await apiKit.proposeTransaction({
    safeAddress: opts.safeAddress ?? '',
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress: senderSignature.signer,
    senderSignature: senderSignature.data,
  });

  // wait until tx is signed & executed
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
  const iface = new Interface(['event ContractCreation(address newContract)']);
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
        return [parsedLog?.args.newContract, tx, receipt];
      }
    } catch (error) {
      console.error('Error parsing log:', error);
    }
  }
  return ['', tx, receipt];
}
