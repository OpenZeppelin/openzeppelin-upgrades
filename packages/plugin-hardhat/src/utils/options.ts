import { ValidationOptions, PollingOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';
import { withPollingDefaults } from '@openzeppelin/upgrades-core/src/validate/overrides';

export interface Options extends ValidationOptions, PollingOptions {
  constructorArgs?: unknown[];
}

export function withDefaults(opts: Options = {}): Required<Options> {
  return {
    constructorArgs: opts.constructorArgs ?? [],
    ...withPollingDefaults(opts),
    ...withValidationDefaults(opts),
  };
}

export interface DeployOptions extends Options {
  initializer?: string | false;
}

export interface UpgradeOptions extends Options {
  call?: { fn: string; args?: unknown[] } | string;
}
