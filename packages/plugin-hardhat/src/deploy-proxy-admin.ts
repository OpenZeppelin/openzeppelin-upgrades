import type { HardhatRuntimeEnvironment } from 'hardhat/types';

import { fetchOrDeployAdmin } from '@openzeppelin/upgrades-core';

import { deploy, getProxyAdminFactory, Options } from './utils';
import { Signer } from 'ethers';

export interface DeployAdminFunction {
  (signer?: Signer, opts?: Options): Promise<string>;
}

export function makeDeployProxyAdmin(hre: HardhatRuntimeEnvironment): DeployAdminFunction {
  return async function deployProxyAdmin(signer?: Signer, opts: Options = {}) {
    const { provider } = hre.network;

    const AdminFactory = await getProxyAdminFactory(hre, signer);
    return await fetchOrDeployAdmin(provider, () => deploy(AdminFactory), opts);
  };
}
