import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';

import { ContractFactory } from 'ethers';

import { ContractAddressOrInstance, getContractAddress } from './utils/index.js';
import { ValidationOptions } from '@openzeppelin/upgrades-core';
import { makeEthersBinding, contractInfo } from './ethers-binding.js';
import { validateUpgrade as engineValidateUpgrade } from './engine/validate.js';

export interface ValidateUpgradeFunction {
  (origImplFactory: ContractFactory, newImplFactory: ContractFactory, opts?: ValidationOptions): Promise<void>;
  (
    proxyOrBeaconAddress: ContractAddressOrInstance,
    newImplFactory: ContractFactory,
    opts?: ValidationOptions,
  ): Promise<void>;
}

export function makeValidateUpgrade(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): ValidateUpgradeFunction {
  return async function validateUpgrade(
    referenceAddressOrImplFactory: ContractAddressOrInstance | ContractFactory,
    newImplFactory: ContractFactory,
    opts: ValidationOptions = {},
  ) {
    const binding = makeEthersBinding(hre, connection, newImplFactory.runner, opts);
    const newImplInfo = contractInfo(newImplFactory);

    if (referenceAddressOrImplFactory instanceof ContractFactory) {
      await engineValidateUpgrade(
        binding,
        { kind: 'info', info: contractInfo(referenceAddressOrImplFactory) },
        newImplInfo,
        opts,
      );
    } else {
      const referenceAddress = await getContractAddress(referenceAddressOrImplFactory);
      await engineValidateUpgrade(binding, { kind: 'address', address: referenceAddress }, newImplInfo, opts);
    }
  };
}
