import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { ContractFactory, Contract } from 'ethers';

import {
  ContractAddressOrInstance,
  getContractAddress,
  getUpgradeableBeaconFactory,
  ForceImportOptions,
} from './utils/index.js';
import { attach, getSigner } from './utils/ethers.js';
import { makeEthersBinding, contractInfo } from './ethers-binding.js';
import { forceImport as engineForceImport } from './engine/force-import.js';

export interface ForceImportFunction {
  (proxyAddress: string, ImplFactory: ContractFactory, opts?: ForceImportOptions): Promise<Contract>;
}

export function makeForceImport(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): ForceImportFunction {
  return async function forceImport(
    addressOrInstance: ContractAddressOrInstance,
    ImplFactory: ContractFactory,
    opts: ForceImportOptions = {},
  ) {
    const binding = makeEthersBinding(hre, connection, ImplFactory.runner, opts);
    const address = await getContractAddress(addressOrInstance);

    const classification = await engineForceImport(binding, address, contractInfo(ImplFactory), opts);

    if (classification === 'beacon') {
      const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(connection, getSigner(ImplFactory.runner));
      return attach(UpgradeableBeaconFactory, address);
    } else {
      return attach(ImplFactory, address);
    }
  };
}
