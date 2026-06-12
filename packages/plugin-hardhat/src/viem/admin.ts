import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { WalletClient } from '@nomicfoundation/hardhat-viem/types';
import type { Address } from 'viem';

import {
  makeChangeProxyAdmin as makeEthersChangeProxyAdmin,
  makeTransferProxyAdminOwnership as makeEthersTransferProxyAdminOwnership,
} from '../admin.js';
import type { EthersDeployOptions } from '../utils/options.js';
import type { AdminOptions } from './options.js';
import { getSigner, toEthersOptions } from './utils.js';

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
  const ethersChangeProxyAdmin = makeEthersChangeProxyAdmin(hre, false, connection);

  return async function changeProxyAdmin(
    proxyAddress: Address,
    newAdmin: Address,
    walletClient?: WalletClient,
    opts: AdminOptions = {},
  ): Promise<void> {
    await ethersChangeProxyAdmin(
      proxyAddress,
      newAdmin,
      await getSigner(connection, walletClient),
      toEthersOptions<EthersDeployOptions>(opts),
    );
  };
}

export function makeTransferProxyAdminOwnership(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): TransferProxyAdminOwnershipFunction {
  const ethersTransferProxyAdminOwnership = makeEthersTransferProxyAdminOwnership(hre, false, connection);

  return async function transferProxyAdminOwnership(
    proxyAddress: Address,
    newOwner: Address,
    walletClient?: WalletClient,
    opts: AdminOptions & { silent?: boolean } = {},
  ): Promise<void> {
    await ethersTransferProxyAdminOwnership(
      proxyAddress,
      newOwner,
      await getSigner(connection, walletClient),
      toEthersOptions<EthersDeployOptions & { silent?: boolean }>(opts),
    );
  };
}
