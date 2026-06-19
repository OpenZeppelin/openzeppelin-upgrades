import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { WalletClient } from '@nomicfoundation/hardhat-viem/types';
import type { Address } from 'viem';

import {
  changeProxyAdmin as engineChangeProxyAdmin,
  transferProxyAdminOwnership as engineTransferProxyAdminOwnership,
} from '../engine/admin.js';
import type { AdminOptions } from './options.js';
import { asAddress, execOptions, resolveWalletClient } from './utils.js';
import { makeViemBinding } from './viem-binding.js';

export type ChangeAdminFunction = (
  proxyAddress: Address,
  newAdmin: Address,
  walletClient?: WalletClient,
  opts?: AdminOptions,
) => Promise<void>;
export type TransferProxyAdminOwnershipFunction = (
  proxyAddress: Address,
  newOwner: Address,
  walletClient?: WalletClient,
  opts?: AdminOptions & { silent?: boolean },
) => Promise<void>;

export function makeChangeProxyAdmin(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): ChangeAdminFunction {
  return async function changeProxyAdmin(
    proxyAddress: Address,
    newAdmin: Address,
    walletClient?: WalletClient,
    opts: AdminOptions = {},
  ): Promise<void> {
    const wc = await resolveWalletClient(connection, walletClient);
    const binding = makeViemBinding(hre, connection, wc, execOptions(opts));
    await engineChangeProxyAdmin(binding, asAddress(proxyAddress), asAddress(newAdmin));
  };
}

export function makeTransferProxyAdminOwnership(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): TransferProxyAdminOwnershipFunction {
  return async function transferProxyAdminOwnership(
    proxyAddress: Address,
    newOwner: Address,
    walletClient?: WalletClient,
    opts: AdminOptions & { silent?: boolean } = {},
  ): Promise<void> {
    const wc = await resolveWalletClient(connection, walletClient);
    const binding = makeViemBinding(hre, connection, wc, execOptions(opts));
    await engineTransferProxyAdminOwnership(binding, asAddress(proxyAddress), asAddress(newOwner), {
      silent: opts.silent,
    });
  };
}
