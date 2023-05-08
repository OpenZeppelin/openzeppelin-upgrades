import type { HardhatRuntimeEnvironment } from 'hardhat/types';

import { fetchOrDeployAdmin } from '@openzeppelin/upgrades-core';

import { deploy, DeployProxyAdminOptions, getProxyAdminFactory } from './utils';
import { Signer } from 'ethers';
import { disablePlatform } from './platform/utils';

export interface DeployAdminFunction {
  (signer?: Signer, opts?: DeployProxyAdminOptions): Promise<string>;
}

export function makeDeployProxyAdmin(hre: HardhatRuntimeEnvironment, platformModule: boolean): DeployAdminFunction {
  return async function deployProxyAdmin(signer?: Signer, opts: DeployProxyAdminOptions = {}) {
    disablePlatform(hre, platformModule, opts, deployProxyAdmin.name);

    const { provider } = hre.network;

    const AdminFactory = await getProxyAdminFactory(hre, signer);
    return await fetchOrDeployAdmin(provider, () => deploy(hre, opts, AdminFactory), opts);
  };
}
