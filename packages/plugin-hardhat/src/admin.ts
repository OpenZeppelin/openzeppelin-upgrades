import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { Contract, Signer } from 'ethers';

import { EthersDeployOptions } from './utils/index.js';
import { disableDefender } from './defender/utils.js';
import { makeEthersBinding } from './ethers-binding.js';
import {
  changeProxyAdmin as engineChangeProxyAdmin,
  transferProxyAdminOwnership as engineTransferProxyAdminOwnership,
} from './engine/admin.js';

type TransferProxyAdminOwnershipOptions = {
  silent?: boolean;
};

export type ChangeAdminFunction = (
  proxyAddress: string,
  newAdmin: string,
  signer?: Signer,
  opts?: EthersDeployOptions,
) => Promise<void>;
export type TransferProxyAdminOwnershipFunction = (
  proxyAddress: string,
  newOwner: string,
  signer?: Signer,
  opts?: TransferProxyAdminOwnershipOptions & EthersDeployOptions,
) => Promise<void>;
export type GetInstanceFunction = (signer?: Signer) => Promise<Contract>;

export function makeChangeProxyAdmin(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
  connection: NetworkConnection,
): ChangeAdminFunction {
  return async function changeProxyAdmin(
    proxyAddress: string,
    newAdmin: string,
    signer?: Signer,
    opts: EthersDeployOptions = {},
  ) {
    disableDefender(hre, defenderModule, {}, changeProxyAdmin.name);

    const binding = makeEthersBinding(hre, connection, signer, opts);
    await engineChangeProxyAdmin(binding, proxyAddress, newAdmin);
  };
}

export function makeTransferProxyAdminOwnership(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
  connection: NetworkConnection,
): TransferProxyAdminOwnershipFunction {
  return async function transferProxyAdminOwnership(
    proxyAddress: string,
    newOwner: string,
    signer?: Signer,
    opts: TransferProxyAdminOwnershipOptions & EthersDeployOptions = {},
  ) {
    disableDefender(hre, defenderModule, {}, transferProxyAdminOwnership.name);

    const binding = makeEthersBinding(hre, connection, signer, opts);
    await engineTransferProxyAdminOwnership(binding, proxyAddress, newOwner, { silent: opts.silent });
  };
}
