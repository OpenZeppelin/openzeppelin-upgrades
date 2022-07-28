import {
  fetchOrDeployGetDeployment,
  getStorageLayout,
  getUnlinkedBytecode,
  getVersion,
  StorageLayout,
  UpgradesError,
  ValidationDataCurrent,
  ValidationOptions,
  Version,
} from '@openzeppelin/upgrades-core';
import type { ContractFactory, ethers } from 'ethers';
import { FormatTypes } from 'ethers/lib/utils';
import type { EthereumProvider, HardhatRuntimeEnvironment } from 'hardhat/types';
import { deploy } from './deploy';
import { GetTxResponse, StandaloneOptions, UpgradeOptions, withDefaults } from './options';
import { validateBeaconImpl, validateProxyImpl, validateImpl } from './validate-impl';
import { readValidations } from './validations';

interface DeployedProxyImpl {
  impl: string;
  kind: NonNullable<ValidationOptions['kind']>;
  txResponse?: ethers.providers.TransactionResponse;
}

interface DeployedBeaconImpl {
  impl: string;
  txResponse?: ethers.providers.TransactionResponse;
}

export interface DeployData {
  provider: EthereumProvider;
  validations: ValidationDataCurrent;
  unlinkedBytecode: string;
  encodedArgs: string;
  version: Version;
  layout: StorageLayout;
  fullOpts: Required<UpgradeOptions>;
}

export async function getDeployData(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: UpgradeOptions,
): Promise<DeployData> {
  const { provider } = hre.network;
  const validations = await readValidations(hre);
  const unlinkedBytecode = getUnlinkedBytecode(validations, ImplFactory.bytecode);
  const encodedArgs = ImplFactory.interface.encodeDeploy(opts.constructorArgs);
  const version = getVersion(unlinkedBytecode, ImplFactory.bytecode, encodedArgs);
  const layout = getStorageLayout(validations, version);
  const fullOpts = withDefaults(opts);
  return { provider, validations, unlinkedBytecode, encodedArgs, version, layout, fullOpts };
}

export async function deployStandaloneImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: StandaloneOptions,
): Promise<DeployedProxyImpl> {
  const deployData = await getDeployData(hre, ImplFactory, opts);
  await validateImpl(deployData, opts);
  return await deployImpl(hre, deployData, ImplFactory, opts);
}

export async function deployProxyImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: UpgradeOptions,
  proxyAddress?: string,
): Promise<DeployedProxyImpl> {
  const deployData = await getDeployData(hre, ImplFactory, opts);
  await validateProxyImpl(deployData, opts, proxyAddress);
  return await deployImpl(hre, deployData, ImplFactory, opts);
}

export async function deployBeaconImpl(
  hre: HardhatRuntimeEnvironment,
  ImplFactory: ContractFactory,
  opts: UpgradeOptions,
  beaconAddress?: string,
): Promise<DeployedBeaconImpl> {
  const deployData = await getDeployData(hre, ImplFactory, opts);
  await validateBeaconImpl(deployData, opts, beaconAddress);
  return await deployImpl(hre, deployData, ImplFactory, opts);
}

async function deployImpl(
  hre: HardhatRuntimeEnvironment,
  deployData: DeployData,
  ImplFactory: ContractFactory,
  opts: UpgradeOptions & GetTxResponse,
): Promise<any> {
  const layout = deployData.layout;

  const deployment = await fetchOrDeployGetDeployment(
    deployData.version,
    deployData.provider,
    async () => {
      const abi = ImplFactory.interface.format(FormatTypes.minimal) as string[];
      const attemptDeploy = () => {
        if (opts.useDeployedImplementation) {
          throw new UpgradesError(
            'The implementation contract was not previously deployed.',
            () =>
              'The useDeployedImplementation option was set to true but the implementation contract was not previously deployed on this network.',
          );
        } else {
          return deploy(ImplFactory, ...deployData.fullOpts.constructorArgs);
        }
      };
      const deployment = Object.assign({ abi }, await attemptDeploy());
      return { ...deployment, layout };
    },
    opts,
  );

  let txResponse;
  if (opts.getTxResponse) {
    if ('deployTransaction' in deployment) {
      txResponse = deployment.deployTransaction;
    } else if (deployment.txHash !== undefined) {
      txResponse = hre.ethers.provider.getTransaction(deployment.txHash);
    }
  }

  return { impl: deployment.address, kind: opts.kind, txResponse };
}
