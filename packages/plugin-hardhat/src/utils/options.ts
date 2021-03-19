import { ValidationOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';

export type Options = DeployOptions & ValidationOptions;

export type ProxyKind = 'auto' | 'uups' | 'transparent';
export type ProxyInitializer = string | false;

export interface DeployOptions {
  initializer?: ProxyInitializer;
  kind?: ProxyKind;
}

export function withDeployDefaults(opts: DeployOptions): Required<DeployOptions> {
  return {
    initializer: opts.initializer ?? 'initialize',
    kind: opts.kind ?? 'auto',
  };
}

export function withDefaults(opts: Options): Required<Options> {
  return {
    ...withDeployDefaults(opts),
    ...withValidationDefaults(opts),
  };
}
