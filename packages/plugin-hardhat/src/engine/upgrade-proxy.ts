import { getAdminAddress, getCode, getUpgradeInterfaceVersion, isEmptySlot } from '@openzeppelin/upgrades-core';

import type { Abi, ContractInfo, EngineBinding, SentTransaction } from './binding.js';
import { deployProxyImpl } from './deploy-impl.js';
import { encodeCall } from './initializer-data.js';
import {
  iTransparentUpgradeableProxyV4Abi,
  iTransparentUpgradeableProxyV5Abi,
  proxyAdminV4Abi,
  proxyAdminV5Abi,
} from './artifacts.js';
import type { UpgradeProxyOptions } from './options.js';
import defaultDebug from '../utils/debug.js';

export interface UpgradeResult {
  proxyAddress: string;
  sent: SentTransaction;
}

/**
 * Client-neutral orchestration of `upgradeProxy`: deploys (or reuses) the new implementation,
 * then sends the upgrade transaction to the proxy or its admin, choosing the right entrypoint
 * based on the on-chain upgrade interface version. Returns the upgrade transaction.
 */
export async function upgradeProxy(
  binding: EngineBinding,
  proxyAddress: string,
  implInfo: ContractInfo,
  opts: UpgradeProxyOptions,
  log = defaultDebug,
): Promise<UpgradeResult> {
  const { impl: nextImpl } = await deployProxyImpl(binding, implInfo, opts, proxyAddress);
  const call = encodeCall(binding, implInfo.abi, opts.call);

  const upgrade = await resolveUpgrade(binding, proxyAddress, log);
  const sent = await upgrade(nextImpl, call);

  return { proxyAddress, sent };
}

type Upgrader = (nextImpl: string, call?: string) => Promise<SentTransaction>;

async function resolveUpgrade(
  binding: EngineBinding,
  proxyAddress: string,
  log: typeof defaultDebug,
): Promise<Upgrader> {
  const provider = binding.provider;

  const adminAddress = await getAdminAddress(provider, proxyAddress);
  const adminBytecode = await getCode(provider, adminAddress);

  const send = (to: string, abi: Abi, fn: string, args: readonly unknown[]) =>
    binding.sendTransaction({ to, data: binding.encodeFunctionData(abi, fn, args) });

  if (isEmptySlot(adminAddress) || adminBytecode === '0x') {
    // No admin contract: use ITransparentUpgradeableProxy to get the proxiable interface
    const upgradeInterfaceVersion = await getUpgradeInterfaceVersion(provider, proxyAddress, log);
    switch (upgradeInterfaceVersion) {
      case '5.0.0': {
        return (nextImpl, call) =>
          send(proxyAddress, iTransparentUpgradeableProxyV5Abi, 'upgradeToAndCall', [nextImpl, call ?? '0x']);
      }
      default: {
        if (upgradeInterfaceVersion !== undefined) {
          // Log as debug if the interface version is an unknown string.
          // Do not throw an error because this could be caused by a fallback function.
          log(
            `Unknown UPGRADE_INTERFACE_VERSION ${upgradeInterfaceVersion} for proxy at ${proxyAddress}. Expected 5.0.0`,
          );
        }
        return (nextImpl, call) =>
          call
            ? send(proxyAddress, iTransparentUpgradeableProxyV4Abi, 'upgradeToAndCall', [nextImpl, call])
            : send(proxyAddress, iTransparentUpgradeableProxyV4Abi, 'upgradeTo', [nextImpl]);
      }
    }
  } else {
    // Admin contract: redirect the upgrade call through it
    const upgradeInterfaceVersion = await getUpgradeInterfaceVersion(provider, adminAddress, log);
    switch (upgradeInterfaceVersion) {
      case '5.0.0': {
        return (nextImpl, call) =>
          send(adminAddress, proxyAdminV5Abi, 'upgradeAndCall', [proxyAddress, nextImpl, call ?? '0x']);
      }
      default: {
        if (upgradeInterfaceVersion !== undefined) {
          log(
            `Unknown UPGRADE_INTERFACE_VERSION ${upgradeInterfaceVersion} for proxy admin at ${adminAddress}. Expected 5.0.0`,
          );
        }
        return (nextImpl, call) =>
          call
            ? send(adminAddress, proxyAdminV4Abi, 'upgradeAndCall', [proxyAddress, nextImpl, call])
            : send(adminAddress, proxyAdminV4Abi, 'upgrade', [proxyAddress, nextImpl]);
      }
    }
  }
}
