import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import {
  Manifest,
  logWarning,
  ProxyDeployment,
  BeaconProxyUnsupportedError,
  RemoteDeploymentId,
} from '@openzeppelin/upgrades-core';

import {
  DeployProxyOptions,
  deploy,
  getProxyFactory,
  getTransparentUpgradeableProxyFactory,
  DeployTransaction,
  deployProxyImpl,
  getInitializerData,
} from './utils';
import { enablePlatform } from './platform/utils';
import { getContractInstance } from './utils/contract-instance';

export interface DeployFunction {
  (ImplFactory: ContractFactory, args?: unknown[], opts?: DeployProxyOptions): Promise<Contract>;
  (ImplFactory: ContractFactory, opts?: DeployProxyOptions): Promise<Contract>;
}

export function makeDeployProxy(hre: HardhatRuntimeEnvironment, platformModule: boolean): DeployFunction {
  return async function deployProxy(
    ImplFactory: ContractFactory,
    args: unknown[] | DeployProxyOptions = [],
    opts: DeployProxyOptions = {},
  ) {
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    opts = enablePlatform(hre, platformModule, opts);

    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    const { impl, kind } = await deployProxyImpl(hre, ImplFactory, opts);

    const contractInterface = ImplFactory.interface;
    const data = getInitializerData(contractInterface, args, opts.initializer);

    if (kind === 'uups') {
      if (await manifest.getAdmin()) {
        logWarning(`A proxy admin was previously deployed on this network`, [
          `This is not natively used with the current kind of proxy ('uups').`,
          `Changes to the admin will have no effect on this new proxy.`,
        ]);
      }
    }

    let proxyDeployment: Required<ProxyDeployment & DeployTransaction> & RemoteDeploymentId;
    switch (kind) {
      case 'beacon': {
        throw new BeaconProxyUnsupportedError();
      }

      case 'uups': {
        const ProxyFactory = await getProxyFactory(hre, ImplFactory.signer);
        proxyDeployment = Object.assign({ kind }, await deploy(hre, opts, ProxyFactory, impl, data));
        break;
      }

      case 'transparent': {
        const adminAddress = await hre.upgrades.deployProxyAdmin(ImplFactory.signer, opts);
        const TransparentUpgradeableProxyFactory = await getTransparentUpgradeableProxyFactory(hre, ImplFactory.signer);
        proxyDeployment = Object.assign(
          { kind },
          await deploy(hre, opts, TransparentUpgradeableProxyFactory, impl, adminAddress, data),
        );
        break;
      }
    }

    await manifest.addProxy(proxyDeployment);

    return getContractInstance(hre, ImplFactory, opts, proxyDeployment);
  };
}
