import {
  fetchOrDeploy,
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
import type { EthereumProvider } from 'hardhat/types/providers';

import type { ContractInfo, DeployedContract, EngineBinding } from './binding.js';
import { StandaloneOptions, UpgradeOptions, withDefaults } from './options.js';
import { validateBeaconImpl, validateProxyImpl, validateImpl } from './validate-impl.js';
import { readValidations } from '../utils/validations.js';

export interface DeployedImpl {
  impl: string;
  /** The implementation deployment record, used by the bindings to expose a transaction response. */
  deployment: DeployedContract;
}

export interface DeployedProxyImpl extends DeployedImpl {
  kind: NonNullable<ValidationOptions['kind']>;
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
  binding: EngineBinding,
  info: ContractInfo,
  opts: UpgradeOptions,
): Promise<DeployData> {
  const provider = binding.provider;
  const validations = await readValidations(binding.hre);

  const unlinkedBytecode = getUnlinkedBytecode(validations, info.bytecode);
  const encodedArgs = binding.encodeConstructorArgs(info, opts.constructorArgs ?? []);
  const version = getVersion(unlinkedBytecode, info.bytecode, encodedArgs);
  const layout = getStorageLayout(validations, version);
  const fullOpts = withDefaults(opts);
  return { provider, validations, unlinkedBytecode, encodedArgs, version, layout, fullOpts };
}

export async function deployUpgradeableImpl(
  binding: EngineBinding,
  info: ContractInfo,
  opts: StandaloneOptions,
  currentImplAddress: string | undefined,
): Promise<DeployedImpl> {
  const deployData = await getDeployData(binding, info, opts);
  await validateImpl(deployData, opts, currentImplAddress);
  return await deployImpl(binding, deployData, info, opts);
}

export async function deployProxyImpl(
  binding: EngineBinding,
  info: ContractInfo,
  opts: UpgradeOptions,
  proxyAddress: string | undefined,
): Promise<DeployedProxyImpl> {
  const deployData = await getDeployData(binding, info, opts);
  await validateProxyImpl(deployData, opts, proxyAddress);
  if (opts.kind === undefined) {
    throw new Error('Broken invariant: Proxy kind is undefined');
  }
  return {
    ...(await deployImpl(binding, deployData, info, opts)),
    kind: opts.kind,
  };
}

export async function deployBeaconImpl(
  binding: EngineBinding,
  info: ContractInfo,
  opts: UpgradeOptions,
  beaconAddress: string | undefined,
): Promise<DeployedImpl> {
  const deployData = await getDeployData(binding, info, opts);
  await validateBeaconImpl(deployData, opts, beaconAddress);
  return await deployImpl(binding, deployData, info, opts);
}

async function deployImpl(
  binding: EngineBinding,
  deployData: DeployData,
  info: ContractInfo,
  opts: UpgradeOptions,
): Promise<DeployedImpl> {
  const layout = deployData.layout;

  if (opts.useDeployedImplementation && opts.redeployImplementation !== undefined) {
    throw new UpgradesError(
      'The useDeployedImplementation and redeployImplementation options cannot both be set at the same time',
    );
  }

  const merge = deployData.fullOpts.redeployImplementation === 'always';

  // The deploy callback is only invoked when a new deployment is actually performed; when an
  // existing deployment is reused from the manifest, `deployed` stays undefined and the
  // transaction response is reconstructed from the manifest's txHash by the binding.
  let deployed: DeployedContract | undefined;

  const deployment = await fetchOrDeployGetDeployment(
    deployData.version,
    deployData.provider,
    async () => {
      const abi = binding.formatManifestAbi(info.abi);
      const attemptDeploy = () => {
        if (deployData.fullOpts.useDeployedImplementation || deployData.fullOpts.redeployImplementation === 'never') {
          throw new UpgradesError('The implementation contract was not previously deployed.', () => {
            if (deployData.fullOpts.useDeployedImplementation) {
              return 'The useDeployedImplementation option was set to true but the implementation contract was not previously deployed on this network.';
            } else {
              return "The redeployImplementation option was set to 'never' but the implementation contract was not previously deployed on this network.";
            }
          });
        } else {
          return binding.deployUnconfirmed(info, deployData.fullOpts.constructorArgs);
        }
      };
      deployed = await attemptDeploy();
      return { abi, ...deployed, layout };
    },
    opts,
    merge,
    binding.getRemoteDeployment,
  );

  const result: DeployedContract = {
    address: deployment.address,
    txHash: deployment.txHash,
    deployTransaction: deployed?.deployTransaction,
    remoteDeploymentId: 'remoteDeploymentId' in deployment ? deployment.remoteDeploymentId : undefined,
  };

  return { impl: deployment.address, deployment: result };
}

/**
 * To import an already deployed contract we reuse fetchOrDeploy for its ability to validate a
 * deployment and record it in the network file, by "simulating" a deployment: the deploy callback
 * simply returns the contract to be imported rather than deploying anything.
 */
export async function simulateDeployImpl(
  binding: EngineBinding,
  info: ContractInfo,
  opts: UpgradeOptions,
  implAddress: string,
): Promise<void> {
  const deployData = await getDeployData(binding, info, opts);
  const simulateDeploy = async () => {
    return {
      abi: binding.formatManifestAbi(info.abi),
      layout: deployData.layout,
      address: implAddress,
    };
  };
  await fetchOrDeploy(deployData.version, deployData.provider, simulateDeploy, opts, true);
}
