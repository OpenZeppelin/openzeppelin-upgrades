import chalk from 'chalk';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Manifest, getAdminAddress } from '@openzeppelin/upgrades-core';
import { Contract, Signer } from 'ethers';
import { EthersDeployOptions, getProxyAdminFactory } from './utils';
import { disablePlatform } from './platform/utils';
import { attach } from './utils/ethers';

const SUCCESS_CHECK = chalk.green('✔') + ' ';
const FAILURE_CROSS = chalk.red('✘') + ' ';

export type ChangeAdminFunction = (
  proxyAddress: string,
  newAdmin: string,
  signer?: Signer,
  opts?: EthersDeployOptions,
) => Promise<void>;
export type TransferProxyAdminOwnershipFunction = (
  newOwner: string,
  signer?: Signer,
  opts?: EthersDeployOptions,
) => Promise<void>;
export type GetInstanceFunction = (signer?: Signer) => Promise<Contract>;

export function makeChangeProxyAdmin(hre: HardhatRuntimeEnvironment, platformModule: boolean): ChangeAdminFunction {
  return async function changeProxyAdmin(
    proxyAddress: string,
    newAdmin: string,
    signer?: Signer,
    opts: EthersDeployOptions = {},
  ) {
    disablePlatform(hre, platformModule, {}, changeProxyAdmin.name);

    const admin = await getManifestAdmin(hre, signer);
    const manifestAdminAddress = await admin.getAddress();
    const proxyAdminAddress = await getAdminAddress(hre.network.provider, proxyAddress);

    if (manifestAdminAddress !== proxyAdminAddress) {
      throw new Error('Proxy admin is not the one registered in the network manifest');
    } else if (manifestAdminAddress !== newAdmin) {
      const overrides = opts.txOverrides ? [opts.txOverrides] : [];
      await admin.changeProxyAdmin(proxyAddress, newAdmin, ...overrides);
    }
  };
}

export function makeTransferProxyAdminOwnership(
  hre: HardhatRuntimeEnvironment,
  platformModule: boolean,
): TransferProxyAdminOwnershipFunction {
  return async function transferProxyAdminOwnership(newOwner: string, signer?: Signer, opts: EthersDeployOptions = {}) {
    disablePlatform(hre, platformModule, {}, transferProxyAdminOwnership.name);

    const admin = await getManifestAdmin(hre, signer);

    const overrides = opts.txOverrides ? [opts.txOverrides] : [];
    await admin.transferOwnership(newOwner, ...overrides);

    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);
    const { proxies } = await manifest.read();
    for (const { address, kind } of proxies) {
      if ((await admin.getAddress()) == (await getAdminAddress(provider, address))) {
        console.log(SUCCESS_CHECK + `${address} (${kind}) proxy ownership transfered through admin proxy`);
      } else {
        console.log(FAILURE_CROSS + `${address} (${kind}) proxy ownership not affected by admin proxy`);
      }
    }
  };
}

export function makeGetInstanceFunction(hre: HardhatRuntimeEnvironment): GetInstanceFunction {
  return async function getInstance(signer?: Signer) {
    return await getManifestAdmin(hre, signer);
  };
}

export async function getManifestAdmin(hre: HardhatRuntimeEnvironment, signer?: Signer): Promise<Contract> {
  const manifest = await Manifest.forNetwork(hre.network.provider);
  const manifestAdmin = await manifest.getAdmin();
  const proxyAdminAddress = manifestAdmin?.address;

  if (proxyAdminAddress === undefined) {
    throw new Error('No ProxyAdmin was found in the network manifest');
  }

  const AdminFactory = await getProxyAdminFactory(hre, signer);
  return attach(AdminFactory, proxyAdminAddress);
}
