import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import {
  Manifest,
  logWarning,
  ProxyDeployment,
  BeaconProxyUnsupportedError,
  RemoteDeploymentId,
  InitialOwnerUnsupportedKindError,
  UpgradesError,
  inferProxyAdmin,
} from '@openzeppelin/upgrades-core';

import {
  DeployProxyOptions,
  deploy,
  getProxyFactory,
  getTransparentUpgradeableProxyFactory,
  DeployTransaction,
  deployProxyImpl,
  getInitializerData,
  getSigner,
} from './utils';
import { enableDefender } from './defender/utils';
import { getContractInstance } from './utils/contract-instance';
import { getInitialOwner } from './utils/initial-owner';
import { ContractTypeOfFactory } from './type-extensions';

export interface DeployFunction {
  <F extends ContractFactory>(
    ImplFactory: F,
    args?: unknown[],
    opts?: DeployProxyOptions,
  ): Promise<ContractTypeOfFactory<F>>;
  <F extends ContractFactory>(ImplFactory: F, opts?: DeployProxyOptions): Promise<ContractTypeOfFactory<F>>;
}

export function makeDeployProxy(hre: HardhatRuntimeEnvironment, defenderModule: boolean): DeployFunction {
  return async function deployProxy<F extends ContractFactory>(
    ImplFactory: F,
    args: unknown[] | DeployProxyOptions = [],
    opts: DeployProxyOptions = {},
  ): Promise<ContractTypeOfFactory<F>> {
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    opts = enableDefender(hre, defenderModule, opts);

    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    const { impl, kind } = await deployProxyImpl(hre, ImplFactory, opts);

    const contractInterface = ImplFactory.interface;
    const data = getInitializerData(contractInterface, args, opts.initializer);
    const deployFn = opts.deployFunction || deploy;

    if (await manifest.getAdmin()) {
      if (kind === 'uups') {
        logWarning(`A proxy admin was previously deployed on this network`, [
          `This is not natively used with the current kind of proxy ('uups').`,
          `Changes to the admin will have no effect on this new proxy.`,
        ]);
      } else if (kind === 'transparent') {
        logWarning(`A proxy admin was previously deployed on this network`, [
          `This is not used with new transparent proxy deployments, since new transparent proxies deploy their own admins.`,
          `Changes to the previous admin will have no effect on this new proxy.`,
        ]);
      }
    }

    const signer = getSigner(ImplFactory.runner);

    let proxyDeployment: Required<ProxyDeployment> & DeployTransaction & RemoteDeploymentId;
    switch (kind) {
      case 'beacon': {
        throw new BeaconProxyUnsupportedError();
      }

      case 'uups': {
        if (opts.initialOwner !== undefined) {
          throw new InitialOwnerUnsupportedKindError(kind);
        }

        const ProxyFactory = opts.proxyFactory || (await getProxyFactory(hre, signer));
        proxyDeployment = Object.assign({ kind }, await deployFn(hre, opts, ProxyFactory, impl, data));
        break;
      }

      case 'transparent': {
        const initialOwner = await getInitialOwner(opts, signer);

        if (!opts.unsafeSkipProxyAdminCheck && (await inferProxyAdmin(provider, initialOwner))) {
          throw new UpgradesError(
            '`initialOwner` must not be a ProxyAdmin contract.',
            () =>
              `If the contract at address ${initialOwner} is not a ProxyAdmin contract and you are sure that this contract is able to call functions on an actual ProxyAdmin, skip this check with the \`unsafeSkipProxyAdminCheck\` option.`,
          );
        }

        const TransparentUpgradeableProxyFactory =
          opts.proxyFactory || (await getTransparentUpgradeableProxyFactory(hre, signer));
        proxyDeployment = Object.assign(
          { kind },
          await deployFn(hre, opts, TransparentUpgradeableProxyFactory, impl, initialOwner, data),
        );
        break;
      }
    }

    await manifest.addProxy(proxyDeployment);

    return getContractInstance(hre, ImplFactory, opts, proxyDeployment);
  };
}
