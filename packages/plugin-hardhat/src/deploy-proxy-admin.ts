import type { HardhatRuntimeEnvironment } from 'hardhat/types';

import { fetchOrDeployAdmin } from '@openzeppelin/upgrades-core';

import { deploy, DeployProxyAdminOptions, getProxyAdminFactory } from './utils';
import { ContractRunner } from 'ethers';
import { disablePlatform } from './platform/utils';

export interface DeployAdminFunction {
  (runner?: null | ContractRunner, opts?: DeployProxyAdminOptions): Promise<string>;
}

export function makeDeployProxyAdmin(hre: HardhatRuntimeEnvironment, platformModule: boolean): DeployAdminFunction {
  return async function deployProxyAdmin(runner?: null | ContractRunner, opts: DeployProxyAdminOptions = {}) {
    disablePlatform(hre, platformModule, opts, deployProxyAdmin.name);

    const { provider } = hre.network;

    const AdminFactory = await getProxyAdminFactory(runner);
    return await fetchOrDeployAdmin(provider, () => deploy(hre, opts, AdminFactory), opts);
  };
}
