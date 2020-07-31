import assert from 'assert';
import chalk from 'chalk';
import { isNodeType } from 'solidity-ast/utils';
import { ContractDefinition } from 'solidity-ast';

import { SrcDecoder } from './src-decoder';
import { levenshtein, Operation } from './levenshtein';
import { UpgradesError } from './error';

export interface StorageItem {
  contract: string;
  label: string;
  type: string;
  src: string;
}

export interface TypeItem {
  label: string;
}

export interface StorageLayout {
  storage: StorageItem[];
  types: Record<string, TypeItem>;
}

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

export function assertStorageUpgradeSafe(original: StorageLayout, updated: StorageLayout): void {
  const errors = getStorageUpgradeErrors(original, updated);

  if (errors.length > 0) {
    throw new StorageUpgradeErrors(errors);
  }
}

class StorageUpgradeErrors extends UpgradesError {
  constructor(readonly errors: ReturnType<typeof getStorageUpgradeErrors>) {
    super(`New storage layout is incompatible`);
  }

  details() {
    return this.errors
      .map(e => {
        return chalk.bold(e.updated?.src ?? 'unknown') + ': ' + e.action + ' of variable ' + e.updated?.label;
      })
      .join('\n\n');
  }
}

export function getStorageUpgradeErrors(
  original: StorageLayout,
  updated: StorageLayout,
): Operation<StorageItem, 'typechange' | 'rename' | 'replace'>[] {
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
  return ops.filter(o => o.action !== 'append');
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
