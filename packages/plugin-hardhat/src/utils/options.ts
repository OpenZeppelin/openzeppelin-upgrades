import { DeployOpts, ValidationOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';

export type Options = ValidationOptions &
  DeployOpts & {
    constructorArgs?: unknown[];
  };

export function withDefaults(opts: Options = {}): Required<Options> {
  return {
    constructorArgs: opts.constructorArgs ?? [],
    timeout: opts.timeout ?? 60e3,
    pollingInterval: opts.pollingInterval ?? 5e3,
    ...withValidationDefaults(opts),
  };
}

export interface DeployProxyOptions extends Options {
  initializer?: string | false;
}

export interface UpgradeProxyOptions extends Options {
  call?: { fn: string; args?: unknown[] } | string;
  unsafeSkipStorageCheck?: boolean;
}
