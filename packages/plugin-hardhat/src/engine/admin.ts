import chalk from 'chalk';
import { Manifest, getAdminAddress } from '@openzeppelin/upgrades-core';

import type { EngineBinding } from './binding.js';
import { proxyAdminV4Abi } from './artifacts.js';
import type { AdminOptions } from './options.js';

const SUCCESS_CHECK = chalk.green('✔') + ' ';

/**
 * Client-neutral orchestration of `admin.changeProxyAdmin`. Only compatible with v4 admins.
 */
export async function changeProxyAdmin(binding: EngineBinding, proxyAddress: string, newAdmin: string): Promise<void> {
  const provider = binding.provider;
  const proxyAdminAddress = await getAdminAddress(provider, proxyAddress);

  await binding.sendTransaction({
    to: proxyAdminAddress,
    data: binding.encodeFunctionData(proxyAdminV4Abi, 'changeProxyAdmin', [proxyAddress, newAdmin]),
  });
}

/**
 * Client-neutral orchestration of `admin.transferProxyAdminOwnership`. Compatible with both v4
 * and v5 admins since they both have `transferOwnership`.
 */
export async function transferProxyAdminOwnership(
  binding: EngineBinding,
  proxyAddress: string,
  newOwner: string,
  opts: AdminOptions,
): Promise<void> {
  const provider = binding.provider;
  const proxyAdminAddress = await getAdminAddress(provider, proxyAddress);

  await binding.sendTransaction({
    to: proxyAdminAddress,
    data: binding.encodeFunctionData(proxyAdminV4Abi, 'transferOwnership', [newOwner]),
  });

  if (!opts.silent) {
    const manifest = await Manifest.forNetwork(provider);
    const { proxies } = await manifest.read();

    const affected = [];
    for (const proxy of proxies) {
      const controller = await getAdminAddress(provider, proxy.address);
      if (controller === proxyAdminAddress) {
        affected.push(proxy);
      }
    }

    if (affected.length > 0) {
      console.log(SUCCESS_CHECK + `${affected.length} proxies ownership transferred through proxy admin`);
      affected.forEach(proxy => console.log(`    - ${proxy.address} (${proxy.kind})`));
    }
  }
}
