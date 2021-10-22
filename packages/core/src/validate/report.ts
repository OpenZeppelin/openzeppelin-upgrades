import _chalk from 'chalk';

import { ErrorDescriptions } from '../error';
import { ValidationError } from './run';

export class UpgradeableContractErrorReport {
  constructor(readonly errors: ValidationError[]) {}

  get ok(): boolean {
    return this.errors.length === 0;
  }

  explain(color = true): string {
    return this.errors.map(e => describeError(e, color)).join('\n\n');
  }
}

const errorInfo: ErrorDescriptions<ValidationError> = {
  constructor: {
    msg: e => `Contract \`${e.contract}\` has a constructor`,
    hint: () => 'Define an initializer instead',
    link: 'https://zpl.in/upgrades/error-001',
  },
  delegatecall: {
    msg: () => `Use of delegatecall is not allowed`,
    link: 'https://zpl.in/upgrades/error-002',
  },
  selfdestruct: {
    msg: () => `Use of selfdestruct is not allowed`,
    link: 'https://zpl.in/upgrades/error-003',
  },
  'state-variable-assignment': {
    msg: e => `Variable \`${e.name}\` is assigned an initial value`,
    hint: () => 'Move the assignment to the initializer',
    link: 'https://zpl.in/upgrades/error-004',
  },
  'state-variable-immutable': {
    msg: e => `Variable \`${e.name}\` is immutable`,
    hint: () => `Use a constant or mutable variable instead`,
    link: 'https://zpl.in/upgrades/error-005',
  },
  'external-library-linking': {
    msg: e => `Linking external libraries like \`${e.name}\` is not yet supported`,
    hint: () =>
      `Use libraries with internal functions only, or skip this check with the \`unsafeAllowLinkedLibraries\` flag \n` +
      `    if you have manually checked that the libraries are upgrade safe`,
    link: 'https://zpl.in/upgrades/error-006',
  },
  'struct-definition': {
    msg: e => `Structs like \`${e.name}\` are supported in the latest version of the plugin`,
    hint: () => `Update your dependency and run again`,
  },
  'enum-definition': {
    msg: e => `Enums like \`${e.name}\` are supported in the latest version of the plugin`,
    hint: () => `Update your dependency and run again`,
  },
  'missing-public-upgradeto': {
    msg: () => `Implementation is missing a public \`upgradeTo(address)\` function`,
    hint: () =>
      `Inherit UUPSUpgradeable to include this function in your contract\n` +
      `    @openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol`,
    link: 'https://zpl.in/upgrades/error-008',
  },
};

function describeError(e: ValidationError, color = true): string {
  const chalk = new _chalk.Instance({ level: color && _chalk.supportsColor ? _chalk.supportsColor.level : 0 });
  const info = errorInfo[e.kind];
  const log = [chalk.bold(e.src) + ': ' + info.msg(e as any)];
  const hint = info.hint?.(e as any);
  if (hint) {
    log.push(hint);
  }
  if (info.link) {
    log.push(chalk.dim(info.link));
  }
  return log.join('\n    ');
}
