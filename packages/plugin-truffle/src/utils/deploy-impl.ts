import {
  getStorageLayout,
  fetchOrDeploy,
  getVersion,
  ValidationOptions,
  EthereumProvider,
  StorageLayout,
  ValidationRunData,
  Version,
  UpgradesError,
} from '@openzeppelin/upgrades-core';

import { deploy } from './deploy';
import { StandaloneOptions, UpgradeOptions, withDefaults } from './options';
import { ContractClass, getTruffleConfig } from './truffle';
import { validateBeaconImpl, validateProxyImpl, validateImpl } from './validate-impl';
import { validateArtifacts, getLinkedBytecode } from './validations';
import { wrapProvider } from './wrap-provider';

interface DeployedImpl {
  impl: string;
  kind: NonNullable<ValidationOptions['kind']>;
}

interface DeployedBeaconImpl {
  impl: string;
}

export interface DeployData {
  fullOpts: Required<UpgradeOptions>;
  validations: ValidationRunData;
  version: Version;
  provider: EthereumProvider;
  layout: StorageLayout;
}

export async function getDeployData(opts: UpgradeOptions, Contract: ContractClass): Promise<DeployData> {
  const fullOpts = withDefaults(opts);
  const provider = wrapProvider(fullOpts.deployer.provider);
  const { contracts_build_directory, contracts_directory } = getTruffleConfig();
  const validations = await validateArtifacts(contracts_build_directory, contracts_directory);
  const linkedBytecode = await getLinkedBytecode(Contract, provider);
  const encodedArgs = encodeArgs(Contract, fullOpts.constructorArgs);
  const version = getVersion(Contract.bytecode, linkedBytecode, encodedArgs);
  const layout = getStorageLayout([validations], version);
  return { fullOpts, validations, version, provider, layout };
}

export async function deployUpgradeableImpl(
  Contract: ContractClass,
  opts: StandaloneOptions,
  currentImplAddress?: string,
): Promise<DeployedImpl> {
  const deployData = await getDeployData(opts, Contract);
  await validateImpl(deployData, opts, currentImplAddress);
  return await deployImpl(deployData, Contract, opts);
}

export async function deployProxyImpl(
  Contract: ContractClass,
  opts: UpgradeOptions,
  proxyAddress?: string,
): Promise<DeployedImpl> {
  const deployData = await getDeployData(opts, Contract);
  await validateProxyImpl(deployData, opts, proxyAddress);
  return deployImpl(deployData, Contract, opts);
}

export async function deployBeaconImpl(
  Contract: ContractClass,
  opts: UpgradeOptions,
  beaconAddress?: string,
): Promise<DeployedBeaconImpl> {
  const deployData = await getDeployData(opts, Contract);
  await validateBeaconImpl(deployData, opts, beaconAddress);
  return await deployImpl(deployData, Contract, opts);
}

function encodeArgs(Contract: ContractClass, constructorArgs: unknown[]): string {
  const fragment = (Contract as any).abi.find((entry: any) => entry.type == 'constructor');

  return (Contract as any).web3.eth.abi.encodeParameters(
    fragment?.inputs?.map((entry: any) => entry.type) ?? [],
    constructorArgs,
  );
}

async function deployImpl(deployData: DeployData, Contract: ContractClass, opts: UpgradeOptions): Promise<any> {
  const layout = deployData.layout;

  const impl = await fetchOrDeploy(deployData.version, deployData.provider, async () => {
    const abi = (Contract as any).abi;
    const attemptDeploy = () => {
      if (opts.useDeployedImplementation) {
        throw new UpgradesError(
          'The implementation contract was not previously deployed.',
          () =>
            'The useDeployedImplementation option was set to true but the implementation contract was not previously deployed on this network.',
        );
      } else {
        return deploy(deployData.fullOpts.deployer, Contract, ...deployData.fullOpts.constructorArgs);
      }
    };
    const deployment = Object.assign({ abi }, await attemptDeploy());
    return { ...deployment, layout };
  });

  return { impl, kind: opts.kind };
}
