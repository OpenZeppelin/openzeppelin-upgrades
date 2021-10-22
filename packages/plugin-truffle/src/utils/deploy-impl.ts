import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  getVersion,
  Manifest,
  getImplementationAddress,
  getStorageLayoutForAddress,
  inferProxyKind,
  ValidationOptions,
  setProxyKind,
} from '@openzeppelin/upgrades-core';

import { deploy } from './deploy';
import { Options, withDefaults } from './options';
import { ContractClass, getTruffleConfig } from './truffle';
import { validateArtifacts, getLinkedBytecode } from './validations';
import { wrapProvider } from './wrap-provider';

interface DeployedImpl {
  impl: string;
  kind: NonNullable<ValidationOptions['kind']>;
}

export async function deployImpl(Contract: ContractClass, opts: Options, proxyAddress?: string): Promise<DeployedImpl> {
  const fullOpts = withDefaults(opts);
  const provider = wrapProvider(fullOpts.deployer.provider);
  const { contracts_build_directory, contracts_directory } = getTruffleConfig();
  const validations = await validateArtifacts(contracts_build_directory, contracts_directory);
  const linkedBytecode = await getLinkedBytecode(Contract, provider);
  const encodedArgs = encodeArgs(Contract, fullOpts.constructorArgs);
  const version = getVersion(Contract.bytecode, linkedBytecode, encodedArgs);
  const layout = getStorageLayout([validations], version);

  if (opts.kind === undefined) {
    fullOpts.kind = inferProxyKind(validations, version);
  }

  if (proxyAddress !== undefined) {
    await setProxyKind(provider, proxyAddress, fullOpts);
  }

  assertUpgradeSafe([validations], version, fullOpts);

  if (proxyAddress !== undefined) {
    const manifest = await Manifest.forNetwork(provider);
    const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
    const currentLayout = await getStorageLayoutForAddress(manifest, validations, currentImplAddress);
    assertStorageUpgradeSafe(currentLayout, layout, fullOpts);
  }

  const impl = await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(fullOpts.deployer, Contract, ...fullOpts.constructorArgs);
    return { ...deployment, layout };
  });

  return { impl, kind: fullOpts.kind };
}

function encodeArgs(Contract: ContractClass, constructorArgs: unknown[]): string {
  const fragment = (Contract as any).abi.find((entry: any) => entry.type == 'constructor');

  return (Contract as any).web3.eth.abi.encodeParameters(
    fragment?.inputs?.map((entry: any) => entry.type) ?? [],
    constructorArgs,
  );
}
