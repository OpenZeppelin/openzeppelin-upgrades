import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';

import { validateUpgrade as engineValidateUpgrade } from '../engine/validate.js';
import type { ValidateUpgradeOptions } from './options.js';
import { ContractAddressOrInstance, getContractAddress, getContractInfo, isAddress, makeReadBinding } from './utils.js';

export interface ValidateUpgradeFunction {
  (
    origContractName: StringWithArtifactContractNamesAutocompletion,
    newContractName: StringWithArtifactContractNamesAutocompletion,
    opts?: ValidateUpgradeOptions,
  ): Promise<void>;
  (
    proxyOrBeaconAddress: ContractAddressOrInstance,
    newContractName: StringWithArtifactContractNamesAutocompletion,
    opts?: ValidateUpgradeOptions,
  ): Promise<void>;
}

export function makeValidateUpgrade(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): ValidateUpgradeFunction {
  return async function validateUpgrade(
    reference: StringWithArtifactContractNamesAutocompletion | ContractAddressOrInstance,
    newContractName: StringWithArtifactContractNamesAutocompletion,
    opts: ValidateUpgradeOptions = {},
  ): Promise<void> {
    const binding = await makeReadBinding(hre, connection);
    const newImplInfo = await getContractInfo(hre, newContractName, opts.libraries);

    if (typeof reference === 'string' && !isAddress(reference)) {
      // The reference is a contract name (contracts-only form)
      const origInfo = await getContractInfo(hre, reference, opts.libraries);
      await engineValidateUpgrade(binding, { kind: 'info', info: origInfo }, newImplInfo, opts);
    } else {
      await engineValidateUpgrade(
        binding,
        { kind: 'address', address: getContractAddress(reference) },
        newImplInfo,
        opts,
      );
    }
  };
}
