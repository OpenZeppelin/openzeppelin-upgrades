import { ValidationOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';

export interface Options extends ValidationOptions {
  constructorArgs?: unknown[];
}

export function withDefaults(opts: Options = {}): Required<Options> {
  return {
    constructorArgs: opts.constructorArgs ?? [],
    ...withValidationDefaults(opts),
  };
}

export interface DeployOptions extends Options {
  initializer?: string | false;
}
