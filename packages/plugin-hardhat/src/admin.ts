import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getAdminAddress } from '@openzeppelin/upgrades-core';
import { Contract, Signer } from 'ethers';
import { EthersDeployOptions, attachProxyAdminV4 } from './utils';
import { disableDefender } from './defender/utils';

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
  opts?: EthersDeployOptions,
) => Promise<void>;
export type GetInstanceFunction = (signer?: Signer) => Promise<Contract>;

export function makeChangeProxyAdmin(hre: HardhatRuntimeEnvironment, defenderModule: boolean): ChangeAdminFunction {
  return async function changeProxyAdmin(
    proxyAddress: string,
    newAdmin: string,
    signer?: Signer,
    opts: EthersDeployOptions = {},
  ) {
    disableDefender(hre, defenderModule, {}, changeProxyAdmin.name);

    const proxyAdminAddress = await getAdminAddress(hre.network.provider, proxyAddress);
    // Only compatible with v4 admins
    const admin = await attachProxyAdminV4(hre, proxyAdminAddress, signer);

    const overrides = opts.txOverrides ? [opts.txOverrides] : [];
    await admin.changeProxyAdmin(proxyAddress, newAdmin, ...overrides);
  };
}

export function makeTransferProxyAdminOwnership(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
): TransferProxyAdminOwnershipFunction {
  return async function transferProxyAdminOwnership(
    proxyAddress: string,
    newOwner: string,
    signer?: Signer,
    opts: EthersDeployOptions = {},
  ) {
    disableDefender(hre, defenderModule, {}, transferProxyAdminOwnership.name);

    const proxyAdminAddress = await getAdminAddress(hre.network.provider, proxyAddress);
    // Compatible with both v4 and v5 admins since they both have transferOwnership
    const admin = await attachProxyAdminV4(hre, proxyAdminAddress, signer);

    const overrides = opts.txOverrides ? [opts.txOverrides] : [];
    await admin.transferOwnership(newOwner, ...overrides);
  };
}
