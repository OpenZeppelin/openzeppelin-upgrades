import assert from 'assert';
import chalk from 'chalk';
import { isNodeType, findAll } from 'solidity-ast/utils';
import { ContractDefinition, StructDefinition, EnumDefinition, TypeDescriptions } from 'solidity-ast';

import { ASTDereferencer } from './ast-dereferencer';
import { SrcDecoder } from './src-decoder';
import { levenshtein, Operation } from './levenshtein';
import { UpgradesError, ErrorDescriptions } from './error';
import { parseTypeId, ParsedTypeId } from './utils/parse-type-id';

// The interfaces below are generic in the way types are represented (through the parameter `Type`). When stored on
// disk, the type is represented by a string: the type id. When loaded onto memory to run the storage layout comparisons
// found in this module, the type id is replaced by its parsed structure together with the corresponding TypeItem, e.g.
// the struct members if it is a struct type.

export interface StorageItem<Type = string> {
  contract: string;
  label: string;
  type: Type;
  src: string;
}

export interface StorageLayout {
  storage: StorageItem[];
  types: Record<string, TypeItem>;
}

export interface TypeItem<Type = string> {
  label: string;
  members?: TypeItemMembers<Type>;
}

export type TypeItemMembers<Type = string> = StructMember<Type>[] | EnumMember[];

export interface StructMember<Type = string> {
  label: string;
  type: Type;
}

type EnumMember = string;

const findTypeNames = findAll([
  'ArrayTypeName',
  'ElementaryTypeName',
  'FunctionTypeName',
  'Mapping',
  'UserDefinedTypeName',
]);

export function extractStorageLayout(
  contractDef: ContractDefinition,
  decodeSrc: SrcDecoder,
  deref: ASTDereferencer,
): StorageLayout {
  const layout: StorageLayout = { storage: [], types: {} };

  // Note: A UserDefinedTypeName can also refer to a ContractDefinition but we won't care about those.
  const derefUserDefinedType = deref(['StructDefinition', 'EnumDefinition']);

  for (const varDecl of contractDef.nodes) {
    if (isNodeType('VariableDeclaration', varDecl)) {
      if (!varDecl.constant && varDecl.mutability !== 'immutable') {
        const type = normalizeTypeIdentifier(typeDescriptions(varDecl).typeIdentifier);

        layout.storage.push({
          contract: contractDef.name,
          label: varDecl.name,
          type,
          src: decodeSrc(varDecl),
        });

        assert(varDecl.typeName != null);

        // We will recursively look for all types involved in this variable declaration in order to store their type
        // information. We iterate over a Map that is indexed by typeIdentifier to ensure we visit each type only once.
        // Note that there can be recursive types.
        const typeNames = new Map(
          [...findTypeNames(varDecl.typeName)].map(n => [typeDescriptions(n).typeIdentifier, n]),
        );

        for (const typeName of typeNames.values()) {
          const { typeIdentifier, typeString: label } = typeDescriptions(typeName);

          const type = normalizeTypeIdentifier(typeIdentifier);

          if (type in layout.types) {
            continue;
          }

          let members;

          if ('referencedDeclaration' in typeName && !/^t_contract\b/.test(type)) {
            const typeDef = derefUserDefinedType(typeName.referencedDeclaration);
            members = getTypeMembers(typeDef);
            // Recursively look for the types referenced in this definition and add them to the queue.
            for (const typeName of findTypeNames(typeDef)) {
              const { typeIdentifier } = typeDescriptions(typeName);
              if (!typeNames.has(typeIdentifier)) {
                typeNames.set(typeIdentifier, typeName);
              }
            }
          }

          layout.types[type] = { label, members };
        }
      }
    }
  }

  return layout;
}

export function assertStorageUpgradeSafe(original: StorageLayout, updated: StorageLayout): void {
  const errors = getStorageUpgradeErrors(original, updated);
  if (errors.length > 0) {
    throw new StorageUpgradeErrors(errors);
  }
}

class StorageUpgradeErrors extends UpgradesError {
  constructor(readonly errors: StorageOperation[]) {
    super(`New storage layout is incompatible due to the following changes`, () => {
      return errors.map(describeError).join('\n\n');
    });
  }
}

function label(variable?: { label: string }): string {
  return variable?.label ? '`' + variable.label + '`' : '<unknown>';
}

const errorInfo: ErrorDescriptions<StorageOperation> = {
  typechange: {
    msg: o => `Type of variable ${label(o.updated)} was changed`,
  },
  rename: {
    msg: o => `Variable ${label(o.original)} was renamed`,
  },
  replace: {
    msg: o => `Variable ${label(o.original)} was replaced with ${label(o.updated)}`,
  },
  insert: {
    msg: o => `Inserted variable ${label(o.updated)}`,
    hint: 'Only insert variables at the end of the most derived contract',
  },
  delete: {
    msg: o => `Deleted variable ${label(o.original)}`,
    hint: 'Keep the variable even if unused',
  },
  append: {
    // this would not be shown to the user but TypeScript needs append here
    msg: () => 'Appended a variable but it is not an error',
  },
};

export function describeError(e: StorageOperation): string {
  const info = errorInfo[e.kind];
  const src = e.updated?.src ?? e.original?.contract ?? 'unknown';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const log = [chalk.bold(src) + ': ' + info.msg(e as any)];
  if (info.hint) {
    log.push(info.hint);
  }
  if (info.link) {
    log.push(chalk.dim(info.link));
  }
  return log.join('\n    ');
}

interface StorageItemDetailed {
  contract: string;
  label: string;
  src: string;
  type: ParsedTypeDetailed;
}

interface ParsedTypeDetailed extends ParsedTypeId {
  item: TypeItem<ParsedTypeDetailed>;
  args?: ParsedTypeDetailed[];
  rets?: ParsedTypeDetailed[];
}

type StorageOperation<T = StorageItemDetailed> = Operation<T, 'typechange' | 'rename' | 'replace'>;

export function getStorageUpgradeErrors(original: StorageLayout, updated: StorageLayout): StorageOperation[] {
  const originalDetailed = getDetailedLayout(original);
  const updatedDetailed = getDetailedLayout(updated);
  return new StorageLayoutComparator().getUpgradeErrors(originalDetailed, updatedDetailed, { allowAppend: true });
}

interface StorageField {
  label: string;
  type: ParsedTypeDetailed;
}

type Replace<T, K extends string, V> = Omit<T, K> & Record<K, V>;

function getDetailedLayout(layout: StorageLayout): StorageItemDetailed[] {
  const cache: Record<string, ParsedTypeDetailed> = {};

  function parseWithDetails<I extends { type: string }>(item: I): Replace<I, 'type', ParsedTypeDetailed> {
    const parsed = {
      ...item,
      type: addDetailsToParsedType(parseTypeId(item.type)),
    };
    return parsed;
  }

  function addDetailsToParsedType(parsed: ParsedTypeId): ParsedTypeDetailed {
    if (parsed.id in cache) {
      return cache[parsed.id];
    } else {
      const item = layout.types[parsed.id];
      const detailed: ParsedTypeDetailed = {
        ...parsed,
        args: undefined,
        rets: undefined,
        item: {
          ...item,
          members: undefined,
        },
      };

      // store in cache before recursion below
      cache[parsed.id] = detailed;

      detailed.args = parsed.args?.map(addDetailsToParsedType);
      detailed.rets = parsed.args?.map(addDetailsToParsedType);
      detailed.item.members =
        item?.members && (isStructMembers(item?.members) ? item.members.map(parseWithDetails) : item?.members);

      return detailed;
    }
  }

  return layout.storage.map(parseWithDetails);
}

function isEnumMembers<T>(members: TypeItemMembers<T>): members is EnumMember[] {
  return members.length === 0 || typeof members[0] === 'string';
}

function isStructMembers<T>(members: TypeItemMembers<T>): members is StructMember<T>[] {
  return members.length === 0 || typeof members[0] === 'object';
}

class StorageLayoutComparator {
  // Holds a stack of type comparisons to detect recursion
  stack = new Set<string>();

  // This function is generic because it can compare top level storage layout as well as struct layout.
  getUpgradeErrors<T extends StorageField>(
    original: T[],
    updated: T[],
    { allowAppend }: { allowAppend: boolean },
  ): StorageOperation<T>[] {
    const ops = levenshtein(original, updated, (a, b) => this.matchStorageField(a, b));
    if (allowAppend) {
      // appending is not an error in this case
      return ops.filter(o => o.kind !== 'append');
    } else {
      return ops;
    }
  }

  matchStorageField(original: StorageField, updated: StorageField) {
    const nameMatches = original.label === updated.label;
    const typeMatches = this.compatibleTypes(original.type, updated.type, { allowAppend: false });

    if (typeMatches && nameMatches) {
      return 'equal';
    } else if (typeMatches) {
      return 'rename';
    } else if (nameMatches) {
      return 'typechange';
    } else {
      return 'replace';
    }
  }

  compatibleTypes(
    original: ParsedTypeDetailed,
    updated: ParsedTypeDetailed,
    { allowAppend }: { allowAppend: boolean },
  ): boolean {
    const stackKey = JSON.stringify({ original: original.id, updated: updated.id, allowAppend });

    if (this.stack.has(stackKey)) {
      throw new UpgradesError(`Recursive types are not supported`, () => `Recursion found in ${updated.item.label}\n`);
    }

    this.stack.add(stackKey);

    try {
      if (original.head !== updated.head) {
        return false;
      }

      if (original.args === undefined || updated.args === undefined) {
        // both should be undefined at the same time
        assert(original.args === updated.args);
        return true;
      }

      const { head } = original;

      if (head === 't_contract') {
        // no storage layout errors can be introduced here since it is just an address
        return true;
      }

      if (head === 't_struct') {
        const originalMembers = original.item.members;
        const updatedMembers = updated.item.members;
        assert(originalMembers && isStructMembers(originalMembers));
        assert(updatedMembers && isStructMembers(updatedMembers));
        const errors = this.getUpgradeErrors(originalMembers, updatedMembers, { allowAppend });
        return errors.length === 0;
      }

      if (head === 't_enum') {
        const originalMembers = original.item.members;
        const updatedMembers = updated.item.members;
        assert(originalMembers && isEnumMembers(originalMembers));
        assert(updatedMembers && isEnumMembers(updatedMembers));
        const ops = levenshtein(originalMembers, updatedMembers, (a, b) => (a === b ? 'equal' : 'replace'));
        // it is only allowed to append new enum members, and there can be no more than 256 as in solidity 0.8
        return ops.every(o => o.kind === 'append') && updatedMembers.length <= 256;
      }

      if (head === 't_mapping') {
        const [originalKey, originalValue] = original.args;
        const [updatedKey, updatedValue] = updated.args;
        // network files migrated from the OZ CLI have an unknown key type
        // we allow it to match with any other key type, carrying over the semantics of OZ CLI
        const keyMatches = originalKey.head === 'unknown' || originalKey.head === updatedKey.head;
        // validate an invariant we assume from solidity: key types are always simple value types
        assert(originalKey.args === undefined && updatedKey.args === undefined);
        // mapping value types are allowed to grow
        return keyMatches && this.compatibleTypes(originalValue, updatedValue, { allowAppend: true });
      }

      if (head === 't_array') {
        const originalLength = original.tail?.match(/^\d+|dyn/)?.[0];
        const updatedLength = updated.tail?.match(/^\d+|dyn/)?.[0];
        assert(originalLength !== undefined && updatedLength !== undefined);
        if (!allowAppend || originalLength === 'dyn' || updatedLength === 'dyn') {
          return originalLength === updatedLength;
        } else {
          return parseInt(updatedLength, 10) >= parseInt(originalLength, 10);
        }
      }

      // in any other case, conservatively assume not compatible
      return false;
    } finally {
      this.stack.delete(stackKey);
    }
  }
}

// Some Type Identifiers contain a _storage_ptr suffix, but the _ptr part
// appears in some places and not others. We remove it to get consistent type
// ids from the different places in the AST.
export function normalizeTypeIdentifier(typeIdentifier: string): string {
  return decodeTypeIdentifier(typeIdentifier).replace(/_storage_ptr\b/g, '_storage');
}

// Type Identifiers in the AST are for some reason encoded so that they don't
// contain parentheses or commas, which have been substituted as follows:
//    (  ->  $_
//    )  ->  _$
//    ,  ->  _$_
// This is particularly hard to decode because it is not a prefix-free code.
// Thus, the following regex has to perform a lookahead to make sure it gets
// the substitution right.
export function decodeTypeIdentifier(typeIdentifier: string): string {
  return typeIdentifier.replace(/(\$_|_\$_|_\$)(?=(\$_|_\$_|_\$)*([^_$]|$))/g, m => {
    switch (m) {
      case '$_':
        return '(';
      case '_$':
        return ')';
      case '_$_':
        return ',';
      default:
        throw new Error('Unreachable');
    }
  });
}

// Type Identifiers contain AST id numbers, which makes them sensitive to
// unrelated changes in the source code. This function stabilizes a type
// identifier by removing all AST ids.
export function stabilizeTypeIdentifier(typeIdentifier: string): string {
  let decoded = decodeTypeIdentifier(typeIdentifier);
  const re = /(t_struct|t_enum|t_contract)\(/g;
  let match;
  while ((match = re.exec(decoded))) {
    let i;
    let d = 1;
    for (i = match.index + match[0].length; d !== 0; i++) {
      assert(i < decoded.length, 'index out of bounds');
      const c = decoded[i];
      if (c === '(') {
        d += 1;
      } else if (c === ')') {
        d -= 1;
      }
    }
    const re2 = /\d+_?/y;
    re2.lastIndex = i;
    decoded = decoded.replace(re2, '');
  }
  return decoded;
}

function getTypeMembers(typeDef: StructDefinition | EnumDefinition): TypeItem['members'] {
  if (typeDef.nodeType === 'StructDefinition') {
    return typeDef.members.map(m => {
      assert(typeof m.typeDescriptions.typeIdentifier === 'string');
      return {
        label: m.name,
        type: normalizeTypeIdentifier(m.typeDescriptions.typeIdentifier),
      };
    });
  } else {
    return typeDef.members.map(m => m.name);
  }
}

interface RequiredTypeDescriptions {
  typeIdentifier: string;
  typeString: string;
}

function typeDescriptions(x: { typeDescriptions: TypeDescriptions }): RequiredTypeDescriptions {
  assert(typeof x.typeDescriptions.typeIdentifier === 'string');
  assert(typeof x.typeDescriptions.typeString === 'string');
  return x.typeDescriptions as RequiredTypeDescriptions;
}
