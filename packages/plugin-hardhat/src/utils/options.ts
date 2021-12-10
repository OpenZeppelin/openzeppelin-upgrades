import { ValidationOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';
import { ContractFactory, Signer } from 'ethers';

export interface Options extends ValidationOptions {
  constructorArgs?: unknown[];
}

export function withDefaults(opts: Options = {}): Required<Options> {
  return {
    constructorArgs: opts.constructorArgs ?? [],
    ...withValidationDefaults(opts),
  };
}

export interface DeployProxyOptions extends Options {
  initializer?: string | false;
}

export interface DeployBeaconProxyOptions extends DeployProxyOptions {
  initializer?: string | false;
  implementation?: ContractFactory;
  signer?: Signer;
}

export interface UpgradeProxyOptions extends Options {
  call?: { fn: string; args?: unknown[] } | string;
}
