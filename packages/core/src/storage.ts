import assert from 'assert';
import chalk from 'chalk';
import { isNodeType } from 'solidity-ast/utils';
import { ContractDefinition } from 'solidity-ast';

import { SrcDecoder } from './src-decoder';
import { levenshtein, Operation } from './levenshtein';
import { UpgradesError, ErrorDescriptions } from './error';

export interface StorageItem {
  contract: string;
  label: string;
  type: string;
  src: string;
}

export interface StorageLayout {
  storage: StorageItem[];
  types: Record<string, TypeItem>;
}

export interface TypeItem {
  label: string;
  members?: TypeItemMembers;
}

export type TypeItemMembers = StructMember[] | EnumMember[];

export interface StructMember {
  label: string;
  type: string;
}

type EnumMember = string;

export function extractStorageLayout(contractDef: ContractDefinition, decodeSrc: SrcDecoder): StorageLayout {
  const layout: StorageLayout = { storage: [], types: {} };

  for (const varDecl of contractDef.nodes) {
    if (isNodeType('VariableDeclaration', varDecl)) {
      if (!varDecl.constant && varDecl.mutability !== 'immutable') {
        const { typeIdentifier, typeString } = varDecl.typeDescriptions;
        assert(typeof typeIdentifier === 'string');
        assert(typeof typeString === 'string');
        const type = decodeTypeIdentifier(typeIdentifier);
        layout.storage.push({
          contract: contractDef.name,
          label: varDecl.name,
          type,
          src: decodeSrc(varDecl),
        });
        layout.types[type] = {
          label: typeString,
        };
      }
    }
  }

  return layout;
}

export function assertStorageUpgradeSafe(
  original: StorageLayout,
  updated: StorageLayout,
  unsafeAllowCustomTypes = false,
): void {
  let errors = getStorageUpgradeErrors(original, updated);

  if (unsafeAllowCustomTypes) {
    // Types with the same name are assumed compatible
    errors = errors.filter(error => !isTypechange(error) || typechangePreservesNames(error));
  }

  if (errors.length > 0) {
    throw new StorageUpgradeErrors(errors);
  }
}

function isTypechange(error: StorageOperation): error is StorageOperation & { kind: 'typechange' } {
  return error.kind === 'typechange';
}

function typechangePreservesNames(error: StorageOperation & { kind: 'typechange' }): boolean {
  assert(error.updated !== undefined);
  assert(error.original !== undefined);
  return stabilizeTypeIdentifier(error.original.type) !== stabilizeTypeIdentifier(error.updated.type);
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

type StorageOperation = Operation<StorageItem, 'typechange' | 'rename' | 'replace'>;

export function getStorageUpgradeErrors(original: StorageLayout, updated: StorageLayout): StorageOperation[] {
  function matchStorageItem(o: StorageItem, u: StorageItem) {
    const nameMatches = o.label === u.label;

    // TODO: type matching should compare struct members, etc.
    const typeMatches = original.types[o.type].label === updated.types[u.type].label;

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

  const ops = levenshtein(original.storage, updated.storage, matchStorageItem);
  return ops.filter(o => o.kind !== 'append');
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
