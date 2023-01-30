import { Node } from 'solidity-ast/node';
import { isNodeType, findAll, ASTDereferencer } from 'solidity-ast/utils';
import type { ContractDefinition, FunctionDefinition } from 'solidity-ast';

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
  src: string;
  inherit: string[];
  libraries: string[];
  methods: string[];
  linkReferences: LinkReference[];
  errors: ValidationError[];
  layout: StorageLayout;
  solcVersion?: string;
}

const errorKinds = [
  'state-variable-assignment',
  'state-variable-immutable',
  'external-library-linking',
  'struct-definition',
  'enum-definition',
  'constructor',
  'delegatecall',
  'selfdestruct',
  'missing-public-upgradeto',
] as const;

export type ValidationError =
  | ValidationErrorConstructor
  | ValidationErrorOpcode
  | ValidationErrorWithName
  | ValidationErrorUpgradeability;

interface ValidationErrorBase {
  src: string;
  kind: typeof errorKinds[number];
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

interface OpcodePattern {
  kind: 'delegatecall' | 'selfdestruct';
  pattern: RegExp;
}

const OPCODES = {
  delegatecall: {
    kind: 'delegatecall',
    pattern: /^t_function_baredelegatecall_/,
  },
  selfdestruct: {
    kind: 'selfdestruct',
    pattern: /^t_function_selfdestruct_/,
  },
} as const;

export function isOpcodeError(error: ValidationErrorBase): error is ValidationErrorOpcode {
  return error.kind === 'delegatecall' || error.kind === 'selfdestruct';
}

interface ValidationErrorUpgradeability extends ValidationErrorBase {
  kind: 'missing-public-upgradeto';
}

function* execall(re: RegExp, text: string) {
  re = new RegExp(re, re.flags + (re.sticky ? '' : 'y'));
  while (true) {
    const match = re.exec(text);
    if (match && match[0] !== '') {
      yield match;
    } else {
      break;
    }
  }
}

function getAllowed(node: Node, reachable: boolean): string[] {
  if ('documentation' in node) {
    const tag = `oz-upgrades-unsafe-allow${reachable ? '-reachable' : ''}`;
    const doc = typeof node.documentation === 'string' ? node.documentation : node.documentation?.text ?? '';
    return getAnnotationArgs(doc, tag);
  } else {
    return [];
  }
}

/**
 * Get args from the doc string matching the given tag
 */
export function getAnnotationArgs(doc: string, tag: string) {
  const result: string[] = [];
  for (const { groups } of execall(
    /^\s*(?:@(?<title>\w+)(?::(?<tag>[a-z][a-z-]*))? )?(?<args>(?:(?!^\s*@\w+)[^])*)/m,
    doc,
  )) {
    if (groups && groups.title === 'custom' && groups.tag === tag) {
      const trimmedArgs = groups.args.trim();
      if (trimmedArgs.length > 0) {
        result.push(...trimmedArgs.split(/\s+/));
      }
    }
  }

  result.forEach(arg => {
    if (!(errorKinds as readonly string[]).includes(arg)) {
      throw new Error(`NatSpec: ${tag} argument not recognized: ${arg}`);
    }
  });

  return result;
}

function skipCheckReachable(error: string, node: Node): boolean {
  return getAllowed(node, true).includes(error);
}

function skipCheck(error: string, node: Node): boolean {
  // skip both allow and allow-reachable errors in the lexical scope
  return getAllowed(node, false).includes(error) || getAllowed(node, true).includes(error);
}

function getFullyQualifiedName(source: string, contractName: string) {
  return `${source}:${contractName}`;
}

export function validate(solcOutput: SolcOutput, decodeSrc: SrcDecoder, solcVersion?: string): ValidationRunData {
  const validation: ValidationRunData = {};
  const fromId: Record<number, string> = {};
  const inheritIds: Record<string, number[]> = {};
  const libraryIds: Record<string, number[]> = {};

  const deref = astDereferencer(solcOutput);

  const delegateCallCache = initOpcodeCache();
  const selfDestructCache = initOpcodeCache();

  for (const source in solcOutput.contracts) {
    for (const contractName in solcOutput.contracts[source]) {
      const bytecode = solcOutput.contracts[source][contractName].evm.bytecode;
      const version = bytecode.object === '' ? undefined : getVersion(bytecode.object);
      const linkReferences = extractLinkReferences(bytecode);

      validation[getFullyQualifiedName(source, contractName)] = {
        src: contractName,
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
        solcVersion,
      };
    }

    for (const contractDef of findAll('ContractDefinition', solcOutput.sources[source].ast)) {
      const key = getFullyQualifiedName(source, contractDef.name);

      fromId[contractDef.id] = key;

      // May be undefined in case of duplicate contract names in Truffle
      const bytecode = solcOutput.contracts[source][contractDef.name]?.evm.bytecode;

      if (key in validation && bytecode !== undefined) {
        inheritIds[key] = contractDef.linearizedBaseContracts.slice(1);
        libraryIds[key] = getReferencedLibraryIds(contractDef);

        validation[key].src = decodeSrc(contractDef);
        validation[key].errors = [
          ...getConstructorErrors(contractDef, decodeSrc),
          ...getOpcodeErrors(contractDef, deref, decodeSrc, delegateCallCache, selfDestructCache),
          ...getStateVariableErrors(contractDef, decodeSrc),
          // TODO: add linked libraries support
          // https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/52
          ...getLinkingErrors(contractDef, bytecode),
        ];

        validation[key].layout = extractStorageLayout(
          contractDef,
          decodeSrc,
          deref,
          solcOutput.contracts[source][contractDef.name].storageLayout,
        );
        validation[key].methods = [...findAll('FunctionDefinition', contractDef)]
          .filter(fnDef => ['external', 'public'].includes(fnDef.visibility))
          .map(fnDef => getFunctionSignature(fnDef, deref));
      }
    }
  }

  for (const key in inheritIds) {
    validation[key].inherit = inheritIds[key].map(id => fromId[id]);
  }

  for (const key in libraryIds) {
    validation[key].libraries = libraryIds[key].map(id => fromId[id]);
  }

  return validation;
}

function* getConstructorErrors(contractDef: ContractDefinition, decodeSrc: SrcDecoder): Generator<ValidationError> {
  for (const fnDef of findAll('FunctionDefinition', contractDef, node => skipCheck('constructor', node))) {
    if (fnDef.kind === 'constructor' && ((fnDef.body?.statements?.length ?? 0) > 0 || fnDef.modifiers.length > 0)) {
      yield {
        kind: 'constructor',
        contract: contractDef.name,
        src: decodeSrc(fnDef),
      };
    }
  }
}

function initOpcodeCache(): OpcodeCache {
  return {
    mainContractErrors: new Map(),
    inheritedContractErrors: new Map(),
  };
}

interface OpcodeCache {
  mainContractErrors: Map<number, ValidationErrorOpcode[]>;
  inheritedContractErrors: Map<number, ValidationErrorOpcode[]>;
}

function* getOpcodeErrors(
  contractDef: ContractDefinition,
  deref: ASTDereferencer,
  decodeSrc: SrcDecoder,
  delegateCallCache: OpcodeCache,
  selfDestructCache: OpcodeCache,
): Generator<ValidationErrorOpcode, void, undefined> {
  yield* getContractOpcodeErrors(contractDef, deref, decodeSrc, OPCODES.delegatecall, 'main', delegateCallCache);
  yield* getContractOpcodeErrors(contractDef, deref, decodeSrc, OPCODES.selfdestruct, 'main', selfDestructCache);
}

/**
 * Whether this node is being visited as part of a main contract, or as an inherited contract or function
 */
type Scope = 'main' | 'inherited';

function* getContractOpcodeErrors(
  contractDef: ContractDefinition,
  deref: ASTDereferencer,
  decodeSrc: SrcDecoder,
  opcode: OpcodePattern,
  scope: Scope,
  cache: OpcodeCache,
): Generator<ValidationErrorOpcode, void, undefined> {
  const cached = getCachedOpcodes(contractDef.id, scope, cache);
  if (cached !== undefined) {
    yield* cached;
  } else {
    const errors: ValidationErrorOpcode[] = [];
    setCachedOpcodes(contractDef.id, scope, cache, errors);
    errors.push(
      ...getFunctionOpcodeErrors(contractDef, deref, decodeSrc, opcode, scope, cache),
      ...getInheritedContractOpcodeErrors(contractDef, deref, decodeSrc, opcode, cache),
    );
    yield* errors;
  }
}

function getCachedOpcodes(key: number, scope: string, cache: OpcodeCache) {
  return scope === 'main' ? cache.mainContractErrors.get(key) : cache.inheritedContractErrors.get(key);
}

function* getFunctionOpcodeErrors(
  contractOrFunctionDef: ContractDefinition | FunctionDefinition,
  deref: ASTDereferencer,
  decodeSrc: SrcDecoder,
  opcode: OpcodePattern,
  scope: Scope,
  cache: OpcodeCache,
): Generator<ValidationErrorOpcode, void, undefined> {
  const parentContractDef = getParentDefinition(deref, contractOrFunctionDef);
  if (parentContractDef === undefined || !skipCheck(opcode.kind, parentContractDef)) {
    yield* getDirectFunctionOpcodeErrors(contractOrFunctionDef, decodeSrc, opcode, scope);
  }
  if (parentContractDef === undefined || !skipCheckReachable(opcode.kind, parentContractDef)) {
    yield* getReferencedFunctionOpcodeErrors(contractOrFunctionDef, deref, decodeSrc, opcode, scope, cache);
  }
}

function* getDirectFunctionOpcodeErrors(
  contractOrFunctionDef: ContractDefinition | FunctionDefinition,
  decodeSrc: SrcDecoder,
  opcode: OpcodePattern,
  scope: Scope,
) {
  for (const fnCall of findAll(
    'FunctionCall',
    contractOrFunctionDef,
    node => skipCheck(opcode.kind, node) || (scope === 'inherited' && isInternalFunction(node)),
  )) {
    const fn = fnCall.expression;
    if (fn.typeDescriptions.typeIdentifier?.match(opcode.pattern)) {
      yield {
        kind: opcode.kind,
        src: decodeSrc(fnCall),
      };
    }
  }
}

function* getReferencedFunctionOpcodeErrors(
  contractOrFunctionDef: ContractDefinition | FunctionDefinition,
  deref: ASTDereferencer,
  decodeSrc: SrcDecoder,
  opcode: OpcodePattern,
  scope: Scope,
  cache: OpcodeCache,
) {
  for (const fnCall of findAll(
    'FunctionCall',
    contractOrFunctionDef,
    node => skipCheckReachable(opcode.kind, node) || (scope === 'inherited' && isInternalFunction(node)),
  )) {
    const fn = fnCall.expression;
    if ('referencedDeclaration' in fn && fn.referencedDeclaration && fn.referencedDeclaration > 0) {
      // non-positive references refer to built-in functions
      const referencedNode = tryDerefFunction(deref, fn.referencedDeclaration);
      if (referencedNode !== undefined) {
        const cached = getCachedOpcodes(referencedNode.id, scope, cache);
        if (cached !== undefined) {
          yield* cached;
        } else {
          const errors: ValidationErrorOpcode[] = [];
          setCachedOpcodes(referencedNode.id, scope, cache, errors);
          errors.push(...getFunctionOpcodeErrors(referencedNode, deref, decodeSrc, opcode, scope, cache));
          yield* errors;
        }
      }
    }
  }
}

function setCachedOpcodes(key: number, scope: string, cache: OpcodeCache, errors: ValidationErrorOpcode[]) {
  if (scope === 'main') {
    cache.mainContractErrors.set(key, errors);
  } else {
    cache.inheritedContractErrors.set(key, errors);
  }
}

function tryDerefFunction(deref: ASTDereferencer, referencedDeclaration: number): FunctionDefinition | undefined {
  try {
    return deref(['FunctionDefinition'], referencedDeclaration);
  } catch (e: any) {
    if (!e.message.includes('No node with id')) {
      throw e;
    }
  }
}

function* getInheritedContractOpcodeErrors(
  contractDef: ContractDefinition,
  deref: ASTDereferencer,
  decodeSrc: SrcDecoder,
  opcode: OpcodePattern,
  cache: OpcodeCache,
) {
  if (!skipCheckReachable(opcode.kind, contractDef)) {
    for (const base of contractDef.baseContracts) {
      const referencedContract = deref('ContractDefinition', base.baseName.referencedDeclaration);
      yield* getContractOpcodeErrors(referencedContract, deref, decodeSrc, opcode, 'inherited', cache);
    }
  }
}

function getParentDefinition(deref: ASTDereferencer, contractOrFunctionDef: ContractDefinition | FunctionDefinition) {
  const parentNode = deref(['ContractDefinition', 'SourceUnit'], contractOrFunctionDef.scope);
  if (parentNode.nodeType === 'ContractDefinition') {
    return parentNode;
  }
}

function isInternalFunction(node: Node) {
  return (
    node.nodeType === 'FunctionDefinition' &&
    node.kind !== 'constructor' && // do not consider constructors as internal, because they are always called by children contracts' constructors
    (node.visibility === 'internal' || node.visibility === 'private')
  );
}

function* getStateVariableErrors(
  contractDef: ContractDefinition,
  decodeSrc: SrcDecoder,
): Generator<ValidationErrorWithName> {
  for (const varDecl of contractDef.nodes) {
    if (isNodeType('VariableDeclaration', varDecl)) {
      if (!varDecl.constant && !isNullish(varDecl.value)) {
        if (!skipCheck('state-variable-assignment', contractDef) && !skipCheck('state-variable-assignment', varDecl)) {
          yield {
            kind: 'state-variable-assignment',
            name: varDecl.name,
            src: decodeSrc(varDecl),
          };
        }
      }
      if (varDecl.mutability === 'immutable') {
        if (!skipCheck('state-variable-immutable', contractDef) && !skipCheck('state-variable-immutable', varDecl)) {
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
  const implicitUsage = [...findAll('UsingForDirective', contractDef)]
    .map(usingForDirective => {
      if (usingForDirective.libraryName !== undefined) {
        return usingForDirective.libraryName.referencedDeclaration;
      } else if (usingForDirective.functionList !== undefined) {
        return [];
      } else {
        throw new Error(
          'Broken invariant: either UsingForDirective.libraryName or UsingForDirective.functionList should be defined',
        );
      }
    })
    .flat();

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
      if (!skipCheck('external-library-linking', contractDef)) {
        yield {
          kind: 'external-library-linking',
          name: libName,
          src: source,
        };
      }
    }
  }
}
