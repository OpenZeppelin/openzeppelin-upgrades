import { ValidationOptions } from '@openzeppelin/upgrades-core';

export type ProxyKind = 'uups' | 'transparent';

export interface DeployOptions extends ValidationOptions {
  initializer?: string | false;
  kind?: ProxyKind;
}

export interface UpgradeOptions extends ValidationOptions {
  kind?: ProxyKind;
}
