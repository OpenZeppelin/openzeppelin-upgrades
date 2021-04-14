import { ProxyDeployment, ValidationOptions, withValidationDefaults } from '@openzeppelin/upgrades-core';

export type ProxyKind = 'auto' | ProxyDeployment['kind'];

export interface Options extends ValidationOptions {
  kind?: ProxyKind;
}

export function withDefaults(opts: Options): Required<Options> {
  return {
    kind: opts.kind ?? 'auto',
    ...withValidationDefaults(opts),
  };
}
