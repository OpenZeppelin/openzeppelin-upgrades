import { isNodeType, findAll } from 'solidity-ast/utils';
import type { ContractDefinition } from 'solidity-ast';

import { SolcOutput, SolcBytecode } from '../solc-api';
import { SrcDecoder } from '../src-decoder';
import { astDereferencer } from '../ast-dereferencer';
import { isNullish } from '../utils/is-nullish';
import { getFunctionSignature } from '../utils/function';
import { Version, getVersion } from '../version';
import { extractLinkReferences, LinkReference } from '../link-refs';
import { extractStorageLayout } from '../storage/extract';
import { StorageLayout } from '../storage/layout';

export type ValidationRunData = Record<string, ContractValidation>;

export interface ContractValidation {
  version?: Version;
  inherit: string[];
  libraries: string[];
  methods: string[];
  linkReferences: LinkReference[];
  errors: ValidationError[];
  layout: StorageLayout;
}

export type ValidationError =
  | ValidationErrorConstructor
  | ValidationErrorOpcode
  | ValidationErrorWithName
  | ValidationErrorUpgradeability;

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

interface ValidationErrorUpgradeability extends ValidationErrorBase {
  kind: 'no-public-upgrade-fn';
}

/**
 * @dev Hardcoded skiplist. Usage:
 *
 * 'ERC1967Upgrade': { '*':     [ 'delegatecall'                                                         ] }, // disable delegatecall check for all functions in the ERC1967Upgrade contract
 * 'ERC1967Upgrade': { 'func1': [ 'delegatecall'                                                         ] }, // disable delegatecall check for func1 in the ERC1967Upgrade contract
 * '*':              { 'func2': [ 'delegatecall'                                                         ] }, // disable delegatecall check for func2 in all contracts
 * 'MyContract':     { '*':     [ 'state-variable-assignment', 'state-variable-immutable', 'constructor' ] }, // disable state variable (assignment & immutable) and constructor checks in MyContract
 * 'MyContract':     { 'lib1':  [ 'external-library-definition'                                          ] }, // disable library check for lib1 in MyContract
 * 'MyContract':     { '*':     [ 'external-library-definition'                                          ] }, // disable library check all libraries in MyContract
 */
const SKIPLIST: Record<string, Record<string, ValidationError['kind'][]>> = {
  ERC1967Upgrade: { functionDelegateCall: ['delegatecall'] },
};

function skipCheck(error: ValidationError['kind'], contract: string, name?: string): boolean {
  const skipForAll = SKIPLIST['*'] || {};
  const skipForContract = SKIPLIST[contract] || {};
  return (
    ('*' in skipForAll && skipForAll['*'].includes(error)) ||
    ('*' in skipForContract && skipForContract['*'].includes(error)) ||
    (name && name in skipForAll && skipForAll[name].includes(error)) ||
    (name && name in skipForContract && skipForContract[name].includes(error)) ||
    false
  );
}

export function validate(solcOutput: SolcOutput, decodeSrc: SrcDecoder): ValidationRunData {
  const validation: ValidationRunData = {};
  const fromId: Record<number, string> = {};
  const inheritIds: Record<string, number[]> = {};
  const libraryIds: Record<string, number[]> = {};

  const deref = astDereferencer(solcOutput);

  for (const source in solcOutput.contracts) {
    for (const contractName in solcOutput.contracts[source]) {
      const bytecode = solcOutput.contracts[source][contractName].evm.bytecode;
      const version = bytecode.object === '' ? undefined : getVersion(bytecode.object);
      const linkReferences = extractLinkReferences(bytecode);

      validation[contractName] = {
        version,
        inherit: [],
        libraries: [],
        methods: [],
        linkReferences,
        errors: [],
        layout: {
          storage: [],
          types: {},
        },
      };
    }

    for (const contractDef of findAll('ContractDefinition', solcOutput.sources[source].ast)) {
      fromId[contractDef.id] = contractDef.name;

      // May be undefined in case of duplicate contract names in Truffle
      const bytecode = solcOutput.contracts[source][contractDef.name]?.evm.bytecode;

      if (contractDef.name in validation && bytecode !== undefined) {
        inheritIds[contractDef.name] = contractDef.linearizedBaseContracts.slice(1);
        libraryIds[contractDef.name] = getReferencedLibraryIds(contractDef);

        validation[contractDef.name].errors = [
          ...getConstructorErrors(contractDef, decodeSrc),
          ...getDelegateCallErrors(contractDef, decodeSrc),
          ...getStateVariableErrors(contractDef, decodeSrc),
          // TODO: add linked libraries support
          // https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/52
          ...getLinkingErrors(contractDef, bytecode),
        ];

        validation[contractDef.name].layout = extractStorageLayout(contractDef, decodeSrc, deref);
        validation[contractDef.name].methods = [...findAll('FunctionDefinition', contractDef)]
          .map(fnDef => getFunctionSignature(fnDef, deref))
          .filter(Boolean) as string[];
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

function* getConstructorErrors(contractDef: ContractDefinition, decodeSrc: SrcDecoder): Generator<ValidationError> {
  if (!skipCheck('constructor', contractDef.name)) {
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
}

function* getDelegateCallErrors(
  contractDef: ContractDefinition,
  decodeSrc: SrcDecoder,
): Generator<ValidationErrorOpcode> {
  for (const fnCall of findAll(
    'FunctionCall',
    contractDef,
    node => isNodeType('FunctionDefinition', node) && skipCheck('delegatecall', contractDef.name, node.name),
  )) {
    const fn = fnCall.expression;
    if (fn.typeDescriptions.typeIdentifier?.match(/^t_function_baredelegatecall_/)) {
      yield {
        kind: 'delegatecall',
        src: decodeSrc(fnCall),
      };
    }
  }
  for (const fnCall of findAll(
    'FunctionCall',
    contractDef,
    node => isNodeType('FunctionDefinition', node) && skipCheck('selfdestruct', contractDef.name, node.name),
  )) {
    const fn = fnCall.expression;
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
        if (!skipCheck('state-variable-assignment', contractDef.name)) {
          yield {
            kind: 'state-variable-assignment',
            name: varDecl.name,
            src: decodeSrc(varDecl),
          };
        }
      }
      if (varDecl.mutability === 'immutable') {
        if (!skipCheck('state-variable-immutable', contractDef.name)) {
          yield {
            kind: 'state-variable-immutable',
            name: varDecl.name,
            src: decodeSrc(varDecl),
          };
        }
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
      if (!skipCheck('external-library-linking', contractDef.name, libName)) {
        yield {
          kind: 'external-library-linking',
          name: libName,
          src: source,
        };
      }
    }
  }
}
