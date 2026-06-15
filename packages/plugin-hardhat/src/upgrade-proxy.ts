import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { ContractFactory, TransactionResponse } from 'ethers';

import debug from './utils/debug.js';
import { UpgradeProxyOptions, getContractAddress, ContractAddressOrInstance } from './utils/index.js';
import { disableDefender } from './defender/utils.js';
import { attach } from './utils/ethers.js';
import { ContractTypeOfFactory } from './type-extensions.js';
import { makeEthersBinding, contractInfo } from './ethers-binding.js';
import { upgradeProxy as engineUpgradeProxy } from './engine/upgrade-proxy.js';

export type UpgradeFunction = <F extends ContractFactory>(
  proxy: ContractAddressOrInstance,
  ImplFactory: F,
  opts?: UpgradeProxyOptions,
) => Promise<ContractTypeOfFactory<F>>;

export function makeUpgradeProxy(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
  connection: NetworkConnection,
  log = debug,
): UpgradeFunction {
  return async function upgradeProxy<F extends ContractFactory>(
    proxy: ContractAddressOrInstance,
    ImplFactory: F,
    opts: UpgradeProxyOptions = {},
  ): Promise<ContractTypeOfFactory<F>> {
    disableDefender(hre, defenderModule, opts, upgradeProxy.name);

    const proxyAddress = await getContractAddress(proxy);

    const binding = makeEthersBinding(hre, connection, ImplFactory.runner, opts);
    const { sent } = await engineUpgradeProxy(binding, proxyAddress, contractInfo(ImplFactory), opts, log);

    const inst = attach(ImplFactory, proxyAddress);
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = sent.txResponse as TransactionResponse | undefined;
    return inst as ContractTypeOfFactory<F>;
  };
}
