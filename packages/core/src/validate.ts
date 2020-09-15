import { isNodeType, findAll } from 'solidity-ast/utils';
import type { ContractDefinition } from 'solidity-ast';
import chalk from 'chalk';

import { SolcOutput, SolcBytecode } from './solc-api';
import { Version, getVersion } from './version';
import { extractStorageLayout, StorageLayout } from './storage';
import { UpgradesError, ErrorDescriptions } from './error';
import { SrcDecoder } from './src-decoder';
import { isNullish } from './utils/is-nullish';

export type Validation = Record<string, ValidationResult>;

export interface ValidationResult {
  version?: Version;
  inherit: string[];
  libraries: string[];
  errors: ValidationError[];
  layout: StorageLayout;
}

type ValidationError = ValidationErrorConstructor | ValidationErrorOpcode | ValidationErrorWithName;

interface ValidationErrorBase {
  src: string;
}

interface ValidationErrorWithName extends ValidationErrorBase {
  name: string;
  kind:
    | 'state-variable-assignment'
    | 'state-variable-immutable'
    | 'external-library-linking'
    | 'struct-definition'
    | 'enum-definition';
}

interface ValidationErrorConstructor extends ValidationErrorBase {
  kind: 'constructor';
  contract: string;
}

interface ValidationErrorOpcode extends ValidationErrorBase {
  kind: 'delegatecall' | 'selfdestruct';
}

export function validate(solcOutput: SolcOutput, decodeSrc: SrcDecoder): Validation {
  const validation: Validation = {};
  const fromId: Record<number, string> = {};
  const inheritIds: Record<string, number[]> = {};
  const libraryIds: Record<string, number[]> = {};

  for (const source in solcOutput.contracts) {
    for (const contractName in solcOutput.contracts[source]) {
      const bytecode = solcOutput.contracts[source][contractName].evm.bytecode.object;
      const version = bytecode === '' ? undefined : getVersion(bytecode);
      validation[contractName] = {
        version,
        inherit: [],
        libraries: [],
        errors: [],
        layout: {
          storage: [],
          types: {},
        },
      };
    }

    for (const contractDef of findAll('ContractDefinition', solcOutput.sources[source].ast)) {
      fromId[contractDef.id] = contractDef.name;

      if (contractDef.name in validation) {
        const { bytecode } = solcOutput.contracts[source][contractDef.name].evm;
        inheritIds[contractDef.name] = contractDef.linearizedBaseContracts.slice(1);
        libraryIds[contractDef.name] = getReferencedLibraryIds(contractDef);

        validation[contractDef.name].errors = [
          ...getConstructorErrors(contractDef, decodeSrc),
          ...getDelegateCallErrors(contractDef, decodeSrc),
          ...getStateVariableErrors(contractDef, decodeSrc),
          // TODO: add support for structs and enums
          // https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/3
          ...getStructErrors(contractDef, decodeSrc),
          ...getEnumErrors(contractDef, decodeSrc),
          // TODO: add linked libraries support
          // https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/52
          ...getLinkingErrors(contractDef, bytecode),
        ];

        validation[contractDef.name].layout = extractStorageLayout(contractDef, decodeSrc);
      }
    }
  }

  for (const contractName in inheritIds) {
    validation[contractName].inherit = inheritIds[contractName].map(id => fromId[id]);
  }

  for (const contractName in libraryIds) {
    validation[contractName].libraries = libraryIds[contractName].map(id => fromId[id]);
  }

  return validation;
}

export function getContractVersion(validation: Validation, contractName: string): Version {
  const { version } = validation[contractName];
  if (version === undefined) {
    throw new Error(`Contract ${contractName} is abstract`);
  }
  return version;
}

function getContractName(validation: Validation, version: Version): string {
  const contractName = Object.keys(validation).find(
    name => validation[name].version?.withMetadata === version.withMetadata,
  );

  if (contractName === undefined) {
    throw new Error('The requested contract was not found. Make sure the source code is available for compilation');
  }

  return contractName;
}

export function getStorageLayout(validation: Validation, version: Version): StorageLayout {
  const contractName = getContractName(validation, version);
  const c = validation[contractName];
  const layout: StorageLayout = { storage: [], types: {} };
  for (const name of [contractName].concat(c.inherit)) {
    layout.storage.unshift(...validation[name].layout.storage);
    Object.assign(layout.types, validation[name].layout.types);
  }
  return layout;
}

export function assertUpgradeSafe(validation: Validation, version: Version, unsafeAllowCustomTypes = false): void {
  const contractName = getContractName(validation, version);
  let errors = getErrors(validation, version);
  let thereAreExceptions = false;

  if (unsafeAllowCustomTypes) {
    errors = errors.filter(error => {
      const isException = ['enum-definition', 'struct-definition'].includes(error.kind);
      thereAreExceptions = thereAreExceptions || isException;
      return !isException;
    });
  }

  if (thereAreExceptions) {
    console.error(
      '\n' +
        chalk.keyword('orange').bold('Warning: ') +
        `Potentially unsafe deployment of ${contractName}\n\n` +
        `    You are using the \`unsafeAllowCustomTypes\` flag to skip storage checks for structs and enums.\n` +
        `    Make sure you have manually checked the storage layout for incompatibilities.\n`,
    );
  }

  if (errors.length > 0) {
    throw new ValidationErrors(contractName, errors);
  }
}

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
    hint: 'Define an initializer instead',
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
    hint: 'Move the assignment to the initializer',
    link: 'https://zpl.in/upgrades/error-004',
  },
  'state-variable-immutable': {
    msg: e => `Variable \`${e.name}\` is immutable`,
    hint: `Use a constant or mutable variable instead`,
    link: 'https://zpl.in/upgrades/error-005',
  },
  'external-library-linking': {
    msg: e => `Linking external libraries like \`${e.name}\` is not yet supported`,
    hint: `Stick to libraries with internal functions only`,
    link: 'https://zpl.in/upgrades/error-006',
  },
  'struct-definition': {
    msg: e => `Defining structs like \`${e.name}\` is not yet supported`,
    hint: `If you have manually checked for storage layout compatibility, you can skip this check with the \`unsafeAllowCustomTypes\` flag`,
    link: 'https://zpl.in/upgrades/error-007',
  },
  'enum-definition': {
    msg: e => `Defining enums like \`${e.name}\` is not yet supported`,
    hint: `If you have manually checked for storage layout compatibility, you can skip this check with the \`unsafeAllowCustomTypes\` flag`,
    link: 'https://zpl.in/upgrades/error-007',
  },
};

function describeError(e: ValidationError): string {
  const info = errorInfo[e.kind];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const log = [chalk.bold(e.src) + ': ' + info.msg(e as any)];
  if (info.hint) {
    log.push(info.hint);
  }
  if (info.link) {
    log.push(chalk.dim(info.link));
  }
  return log.join('\n    ');
}

export function getErrors(validation: Validation, version: Version): ValidationError[] {
  const contractName = getContractName(validation, version);
  const c = validation[contractName];
  return c.errors
    .concat(...c.inherit.map(name => validation[name].errors))
    .concat(...c.libraries.map(name => validation[name].errors));
}

export function isUpgradeSafe(validation: Validation, version: Version): boolean {
  return getErrors(validation, version).length == 0;
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

function* getDelegateCallErrors(
  contractDef: ContractDefinition,
  decodeSrc: SrcDecoder,
): Generator<ValidationErrorOpcode> {
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

function* getStateVariableErrors(
  contractDef: ContractDefinition,
  decodeSrc: SrcDecoder,
): Generator<ValidationErrorWithName> {
  for (const varDecl of contractDef.nodes) {
    if (isNodeType('VariableDeclaration', varDecl)) {
      if (!varDecl.constant && !isNullish(varDecl.value)) {
        yield {
          kind: 'state-variable-assignment',
          name: varDecl.name,
          src: decodeSrc(varDecl),
        };
      }
      if (varDecl.mutability === 'immutable') {
        yield {
          kind: 'state-variable-immutable',
          name: varDecl.name,
          src: decodeSrc(varDecl),
        };
      }
    }
  }
}

function getReferencedLibraryIds(contractDef: ContractDefinition): number[] {
  const implicitUsage = [...findAll('UsingForDirective', contractDef)].map(
    usingForDirective => usingForDirective.libraryName.referencedDeclaration,
  );

  const explicitUsage = [...findAll('Identifier', contractDef)]
    .filter(identifier => identifier.typeDescriptions.typeString?.match(/^type\(library/))
    .map(identifier => {
      if (isNullish(identifier.referencedDeclaration)) {
        throw new Error('Broken invariant: Identifier.referencedDeclaration should not be null');
      }
      return identifier.referencedDeclaration;
    });

  return [...new Set(implicitUsage.concat(explicitUsage))];
}

function* getLinkingErrors(
  contractDef: ContractDefinition,
  bytecode: SolcBytecode,
): Generator<ValidationErrorWithName> {
  const { linkReferences } = bytecode;
  for (const source of Object.keys(linkReferences)) {
    for (const libName of Object.keys(linkReferences[source])) {
      yield {
        kind: 'external-library-linking',
        name: libName,
        src: source,
      };
    }
  }
}

function* getStructErrors(contractDef: ContractDefinition, decodeSrc: SrcDecoder): Generator<ValidationErrorWithName> {
  for (const structDefinition of findAll('StructDefinition', contractDef)) {
    yield {
      kind: 'struct-definition',
      name: structDefinition.name,
      src: decodeSrc(structDefinition),
    };
  }
}

function* getEnumErrors(contractDef: ContractDefinition, decodeSrc: SrcDecoder): Generator<ValidationErrorWithName> {
  for (const enumDefinition of findAll('EnumDefinition', contractDef)) {
    yield {
      kind: 'enum-definition',
      name: enumDefinition.name,
      src: decodeSrc(enumDefinition),
    };
  }
}
