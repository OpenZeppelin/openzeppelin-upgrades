import {
  assertUpgradeSafe,
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
import { DeployImplementationOptions, Options, withDefaults } from './options';
import { ContractClass, getTruffleConfig } from './truffle';
import { validateBeaconImpl, validateProxyImpl, validateStandaloneImpl } from './validate-impl';
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
  fullOpts: Required<Options>;
  validations: ValidationRunData;
  version: Version;
  provider: EthereumProvider;
  layout: StorageLayout;
}

export async function getDeployData(opts: Options, Contract: ContractClass): Promise<DeployData> {
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

export async function deployStandaloneImpl(
  Contract: ContractClass,
  opts: DeployImplementationOptions,
): Promise<DeployedImpl> {
  const deployData = await getDeployData(opts, Contract);
  await validateStandaloneImpl(deployData, opts);
  return await fetchOrDeployImpl(deployData, Contract, opts);
}

export async function deployProxyImpl(
  Contract: ContractClass,
  opts: DeployImplementationOptions,
  proxyAddress?: string,
): Promise<DeployedImpl> {
  const deployData = await getDeployData(opts, Contract);
  await validateProxyImpl(deployData, opts, proxyAddress);
  return fetchOrDeployImpl(deployData, Contract, opts);
}

export async function deployBeaconImpl(
  Contract: ContractClass,
  opts: DeployImplementationOptions,
  beaconAddress?: string,
): Promise<DeployedBeaconImpl> {
  const deployData = await getDeployData(opts, Contract);
  await validateBeaconImpl(deployData, opts, beaconAddress);
  return await fetchOrDeployImpl(deployData, Contract, opts);
}

function encodeArgs(Contract: ContractClass, constructorArgs: unknown[]): string {
  const fragment = (Contract as any).abi.find((entry: any) => entry.type == 'constructor');

  return (Contract as any).web3.eth.abi.encodeParameters(
    fragment?.inputs?.map((entry: any) => entry.type) ?? [],
    constructorArgs,
  );
}

async function fetchOrDeployImpl(
  deployData: DeployData,
  Contract: ContractClass,
  opts: DeployImplementationOptions,
): Promise<any> {
  assertUpgradeSafe([deployData.validations], deployData.version, deployData.fullOpts);
  const layout = deployData.layout;

  const impl = await fetchOrDeploy(deployData.version, deployData.provider, async () => {
    const abi = (Contract as any).abi;
    const deployImpl = () => {
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
    const deployment = Object.assign({ abi }, await deployImpl());
    return { ...deployment, layout };
  });

  return { impl, kind: opts.kind };
}
