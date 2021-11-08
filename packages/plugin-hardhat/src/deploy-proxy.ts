import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract } from 'ethers';

import { Manifest, fetchOrDeployAdmin, logWarning, ProxyDeployment } from '@openzeppelin/upgrades-core';

import {
  DeployOptions,
  deploy,
  deployImpl,
  getProxyFactory,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
  DeployTransaction,
  getBeaconProxyFactory,
  getUpgradeableBeaconFactory,
} from './utils';
import { Interface } from '@ethersproject/abi';

export interface DeployFunction {
  (ImplFactory: ContractFactory, args?: unknown[], opts?: DeployOptions): Promise<Contract>;
  (ImplFactory: ContractFactory, opts?: DeployOptions): Promise<Contract>;
}

export function makeDeployProxy(hre: HardhatRuntimeEnvironment): DeployFunction {
  return async function deployProxy(
    ImplFactory: ContractFactory,
    args: unknown[] | DeployOptions = [],
    opts: DeployOptions = {},
  ) {
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    const { provider } = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    const { impl, kind } = await deployImpl(hre, ImplFactory, opts);
    const contractInterface = ImplFactory.interface;
    const data = getInitializerData(contractInterface, args, opts.initializer);

    if (kind === 'uups' || kind === 'beacon') {
      if (await manifest.getAdmin()) {
        logWarning(`A proxy admin was previously deployed on this network`, [
          `This is not natively used with the current kind of proxy ('${kind}').`,
          `Changes to the admin will have no effect on this new proxy.`,
        ]);
      }
    }

    let proxyDeployment: Required<ProxyDeployment & DeployTransaction>;
    switch (kind) {
      case 'uups': {
        const ProxyFactory = await getProxyFactory(hre, ImplFactory.signer);
        proxyDeployment = Object.assign({ kind }, await deploy(ProxyFactory, impl, data));
        break;
      }

      case 'beacon': {
        const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(hre, ImplFactory.signer);
        const beaconDeployment = await deploy(UpgradeableBeaconFactory, impl);
        const BeaconProxyFactory = await getBeaconProxyFactory(hre, ImplFactory.signer);
        proxyDeployment = Object.assign({ kind }, await deploy(BeaconProxyFactory, beaconDeployment.address, data));
        break;
      }

      case 'transparent': {
        const AdminFactory = await getProxyAdminFactory(hre, ImplFactory.signer);
        const adminAddress = await fetchOrDeployAdmin(provider, () => deploy(AdminFactory));
        const TransparentUpgradeableProxyFactory = await getTransparentUpgradeableProxyFactory(hre, ImplFactory.signer);
        proxyDeployment = Object.assign(
          { kind },
          await deploy(TransparentUpgradeableProxyFactory, impl, adminAddress, data),
        );
        break;
      }
    }

    await manifest.addProxy(proxyDeployment);

    const inst = ImplFactory.attach(proxyDeployment.address);
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = proxyDeployment.deployTransaction;
    return inst;
  };
}

export function getInitializerData(contractInterface: Interface, args: unknown[], initializer?: string | false): string {
  if (initializer === false) {
    return '0x';
  }

  const allowNoInitialization = initializer === undefined && args.length === 0;
  initializer = initializer ?? 'initialize';

  try {
    const fragment = contractInterface.getFunction(initializer);
    return contractInterface.encodeFunctionData(fragment, args);
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (allowNoInitialization && e.message.includes('no matching function')) {
        return '0x';
      }
    }
    throw e;
  }
}
