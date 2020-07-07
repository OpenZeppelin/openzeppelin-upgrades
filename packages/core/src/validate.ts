import fs from 'fs';
import crypto from 'crypto';
import { isNodeType, findAll } from 'solidity-ast/utils';
import type { ContractDefinition } from 'solidity-ast';
import { SolcOutput, SolcInput } from './solc-api';
import chalk from 'chalk';

import { getVersionId } from './version';
import { extractStorageLayout, StorageLayout } from './storage';
import { UpgradesError } from './error';

export type Validation = Record<string, ValidationResult>;

interface ValidationResult {
  version?: string;
  inherit: string[];
  errors: ValidationError[];
  layout: StorageLayout;
}

type ValidationError =
  | ValidationErrorStateVariable
  | ValidationErrorConstructor
  | ValidationErrorDelegateCall
  | ValidationErrorSelfdestruct;

interface ValidationErrorBase {
  src: string;
}

interface ValidationErrorStateVariable extends ValidationErrorBase {
  kind: 'state-variable-assignment' | 'state-variable-immutable';
  name: string;
}

interface ValidationErrorConstructor extends ValidationErrorBase {
  kind: 'constructor';
  contract: string;
}

interface ValidationErrorDelegateCall extends ValidationErrorBase {
  kind: 'delegatecall';
}

interface ValidationErrorSelfdestruct extends ValidationErrorBase {
  kind: 'selfdestruct';
}

type SrcDecoder = (node: { src: string }) => string;

export function validate(solcOutput: SolcOutput, solcInput?: SolcInput): Validation {
  const validation: Validation = {};
  const fromId: Record<number, string> = {};
  const inheritIds: Record<string, number[]> = {}

  for (const source in solcOutput.contracts) {
    for (const contractName in solcOutput.contracts[source]) {
      const bytecode = solcOutput.contracts[source][contractName].evm.deployedBytecode.object;
      const version = bytecode === '' ? undefined : getVersionId(bytecode);
      validation[contractName] = {
        version,
        inherit: [],
        errors: [],
        layout: {
          storage: [],
          types: {},
        },
      };
    }

    const content = solcInput?.sources[source].content;
    if (content === undefined) {
      throw new Error(`Source for file ${source} not found`);
    }
    const decodeSrc: SrcDecoder = ({src}) => {
      const begin = Number(src.split(':', 1)[0]);
      const line = content.substr(0, begin).split('\n').length;
      return source + ':' + line;
    };

    for (const contractDef of findAll('ContractDefinition', solcOutput.sources[source].ast)) {
      fromId[contractDef.id] = contractDef.name;

      if (contractDef.name in validation) {
        inheritIds[contractDef.name] = contractDef.linearizedBaseContracts.slice(1);

        validation[contractDef.name].errors = [
          ...getConstructorErrors(contractDef, decodeSrc),
          ...getDelegateCallErrors(contractDef, decodeSrc),
          ...getStateVariableErrors(contractDef, decodeSrc),
        ];

        validation[contractDef.name].layout = extractStorageLayout(contractDef, decodeSrc);
      }
    }
  }

  for (const contractName in inheritIds) {
    validation[contractName].inherit = inheritIds[contractName].map(id => fromId[id]);
  }

  return validation;
}

export function getStorageLayout(validation: Validation, contractName: string): StorageLayout {
  const c = validation[contractName];
  if (c === undefined) {
    throw new Error(`Contract ${contractName} not found`);
  }
  const layout: StorageLayout = { storage: [], types: {} };
  for (const name of [contractName].concat(c.inherit)) {
    layout.storage.unshift(...validation[name].layout.storage);
    Object.assign(layout.types, validation[name].layout.types);
  }
  return layout;
}

export function assertUpgradeSafe(validation: Validation, contractName: string) {
  const errors = getErrors(validation, contractName);

  if (errors.length > 0) {
    throw new ValidationErrors(contractName, errors);
  }
}

class ValidationErrors extends UpgradesError {
  constructor(contractName: string, readonly errors: ValidationError[]) {
    super(`Contract \`${contractName}\` is not upgrade safe`);
  }

  details() {
    return this.errors.map(describeError).join('\n\n');
  }
}

interface ErrorInfo<K> {
  msg: (e: ValidationError & { kind: K }) => string;
  hint?: string;
  link: string;
};

const errorInfo: { [K in ValidationError['kind']]: ErrorInfo<K> } = {
  'constructor': {
    msg: e => `Contract \`${e.contract}\` has a constructor`,
    hint: 'Define an initializer instead',
    link: 'https://zpl.in/upgrades/error-001',
  },
  'delegatecall': {
    msg: e => `Use of delegatecall is not allowed`,
    link: 'https://zpl.in/upgrades/error-002',
  },
  'selfdestruct': {
    msg: e => `Use of selfdestruct is not allowed`,
    link: 'https://zpl.in/upgrades/error-003',
  },
  'state-variable-assignment': {
    msg: e => `Variable \`${e.name}\` is assigned an initial value`,
    hint: 'Move the assignment to the initializer',
    link: 'https://zpl.in/upgrades/error-004',
  },
  'state-variable-immutable': {
    msg: e => `Variable \`${e.name}\` is immutable`,
    hint: `Use a constant or mutable variable instead`,
    link: 'https://zpl.in/upgrades/error-005',
  },
};

function describeError(e: ValidationError): string {
  const info = errorInfo[e.kind];
  let log = chalk.bold(e.src) + ': ' + info.msg(e as any) + '\n    ';
  if (info.hint) log += info.hint + '\n    ';
  log += chalk.dim(info.link);
  return log;
}

export function getErrors(validation: Validation, contractName: string): ValidationError[] {
  const c = validation[contractName];
  if (c === undefined) {
    throw new Error(`Contract ${contractName} not found`);
  }
  return c.errors.concat(...c.inherit.map(name => validation[name].errors));
}

export function isUpgradeSafe(validation: Validation, contractName: string): boolean {
    return getErrors(validation, contractName).length == 0;
}

function* getConstructorErrors(contractDef: ContractDefinition, decodeSrc: SrcDecoder): Generator<ValidationError> {
  for (const fnDef of findAll('FunctionDefinition', contractDef)) {
    if (fnDef.kind === 'constructor' && ((fnDef.body?.statements.length ?? 0) > 0 || fnDef.modifiers.length > 0)) {
      yield {
        kind: 'constructor',
        contract: contractDef.name,
        src: decodeSrc(fnDef),
      };
    }
  }
}

function* getDelegateCallErrors(contractDef: ContractDefinition, decodeSrc: SrcDecoder): Generator<ValidationErrorDelegateCall | ValidationErrorSelfdestruct> {
  for (const fnCall of findAll('FunctionCall', contractDef)) {
    const fn = fnCall.expression;
    if (fn.typeDescriptions.typeIdentifier?.match(/^t_function_baredelegatecall_/)) {
      yield {
        kind: 'delegatecall',
        src: decodeSrc(fnCall),
      };
    }
    if (fn.typeDescriptions.typeIdentifier?.match(/^t_function_selfdestruct_/)) {
      yield {
        kind: 'selfdestruct',
        src: decodeSrc(fnCall),
      };
    }
  }
}

function* getStateVariableErrors(contractDef: ContractDefinition, decodeSrc: SrcDecoder): Generator<ValidationErrorStateVariable> {
  for (const varDecl of contractDef.nodes) {
    if (isNodeType('VariableDeclaration', varDecl)) {
      if (!varDecl.constant && varDecl.value !== null) {
        yield {
          kind: 'state-variable-assignment',
          name: varDecl.name,
          src: decodeSrc(varDecl),
        }
      }
      if (varDecl.mutability === 'immutable') {
        yield {
          kind: 'state-variable-immutable',
          name: varDecl.name,
          src: decodeSrc(varDecl),
        }
      }
    }
  }
}
