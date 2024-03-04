import chalk from 'chalk';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Manifest, getAdminAddress } from '@openzeppelin/upgrades-core';
import { Contract, Signer } from 'ethers';
import { EthersDeployOptions, attachProxyAdminV4 } from './utils';
import { disableDefender } from './defender/utils';

const SUCCESS_CHECK = chalk.green('✔') + ' ';

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
    opts: TransferProxyAdminOwnershipOptions & EthersDeployOptions = {},
  ) {
    disableDefender(hre, defenderModule, {}, transferProxyAdminOwnership.name);

    const proxyAdminAddress = await getAdminAddress(hre.network.provider, proxyAddress);
    // Compatible with both v4 and v5 admins since they both have transferOwnership
    const admin = await attachProxyAdminV4(hre, proxyAdminAddress, signer);

    const overrides = opts.txOverrides ? [opts.txOverrides] : [];
    await admin.transferOwnership(newOwner, ...overrides);

    if (!opts.silent) {
      const { provider } = hre.network;
      const manifest = await Manifest.forNetwork(provider);
      const { proxies } = await manifest.read();
      const adminAddress = await admin.getAddress();

      const affected = [];
      for (const proxy of proxies) {
        const controller = await getAdminAddress(provider, proxy.address);
        if (controller === adminAddress) {
          affected.push(proxy);
        }
      }

      if (affected.length > 0) {
        console.log(SUCCESS_CHECK + `${affected.length} proxies ownership transferred through proxy admin`);
        affected.forEach(proxy => console.log(`    - ${proxy.address} (${proxy.kind})`));
      }
    }
  };
}
