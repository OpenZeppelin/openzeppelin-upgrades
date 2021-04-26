import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  getVersion,
  Manifest,
  getImplementationAddress,
  getStorageLayoutForAddress,
} from '@openzeppelin/upgrades-core';

import { deploy } from './deploy';
import { Options } from './options';
import { ContractClass, getTruffleConfig } from './truffle';
import { validateArtifacts, getLinkedBytecode } from './validations';
import { wrapProvider } from './wrap-provider';

export async function deployImpl(
  Contract: ContractClass,
  requiredOpts: Required<Options>,
  proxyAddress?: string,
): Promise<string> {
  if (requiredOpts.kind === 'transparent') {
    requiredOpts.unsafeAllow.push('missing-public-upgradeto');
  }

  const provider = wrapProvider(requiredOpts.deployer.provider);
  const { contracts_build_directory, contracts_directory } = getTruffleConfig();
  const validations = await validateArtifacts(contracts_build_directory, contracts_directory);
  const linkedBytecode = await getLinkedBytecode(Contract, provider);
  const version = getVersion(Contract.bytecode, linkedBytecode);
  const layout = getStorageLayout([validations], version);
  assertUpgradeSafe([validations], version, requiredOpts);

  if (proxyAddress !== undefined) {
    const manifest = await Manifest.forNetwork(provider);
    const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
    const currentLayout = await getStorageLayoutForAddress(manifest, validations, currentImplAddress);
    assertStorageUpgradeSafe(currentLayout, layout, requiredOpts.unsafeAllowCustomTypes);
  }

  return await fetchOrDeploy(version, provider, async () => {
    const deployment = await deploy(requiredOpts.deployer, Contract);
    return { ...deployment, layout };
  });
}
