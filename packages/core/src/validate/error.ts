import chalk from 'chalk';

import { ValidationError } from './run';
import { UpgradesError, ErrorDescriptions } from '../error';

export class ValidationErrors extends UpgradesError {
  constructor(contractName: string, readonly errors: ValidationError[]) {
    super(`Contract \`${contractName}\` is not upgrade safe`, () => {
      return errors.map(describeError).join('\n\n');
    });
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
  'inline-assembly': {
    msg: () => `Use of inline assembly is not allowed`,
    link: 'https://zpl.in/upgrades/error-007', // TODO: add documentation
  },
  'no-public-upgrade-fn': {
    msg: () => `Implementation is missing a public \`upgradeTo(address)\` function`,
    hint: () =>
      `Have your implementation inherit from proxy/UUPS/Proxiable or use a transparent proxy by setting the \`kind: 'transparent'\` option`,
    link: 'https://zpl.in/upgrades/error-008', // TODO: add documentation
  },
};

function describeError(e: ValidationError): string {
  const info = errorInfo[e.kind];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const log = [chalk.bold(e.src) + ': ' + info.msg(e as any)];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hint = info.hint?.(e as any);
  if (hint) {
    log.push(hint);
  }
  if (info.link) {
    log.push(chalk.dim(info.link));
  }
  return log.join('\n    ');
}
