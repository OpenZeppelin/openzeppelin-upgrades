import assert from 'assert';

import { levenshtein, Operation } from '../levenshtein';
import { ParsedTypeDetailed, StorageItem } from './layout';
import { UpgradesError } from '../error';
import { isEnumMembers, isStructMembers } from './layout';

export type StorageOperation<T = StorageItem<ParsedTypeDetailed>> = Operation<T, StorageMatchResult>;

interface StorageField {
  label: string;
  type: ParsedTypeDetailed;
}

abstract class StorageMatchResult {
  abstract isEqual(): boolean;
  abstract errorMessage(o: Operation<StorageField, this> & { kind: 'replaced' }): string;

  hint(): string | undefined {
    return undefined;
  }

  private static _equal?: StorageMatchEqual;
  static get equal(): StorageMatchEqual {
    return this._equal ?? (this._equal = new StorageMatchEqual());
  }
}

class StorageMatchEqual extends StorageMatchResult {
  isEqual(): true {
    return true;
  }

  errorMessage(): never {
    throw new Error('No storage match error here');
  }
}

type StorageMatchErrorKind = 'typechange' | 'rename' | 'replace' | 'enum resize';

class StorageMatchError extends StorageMatchResult {
  constructor(readonly errorKind: StorageMatchErrorKind) {
    super();
  }

  isEqual(): false {
    return false;
  }

  errorMessage(o: Operation<StorageField, this> & { kind: 'replaced' }) {
    switch (this.errorKind) {
      case 'typechange':
        return `Type of variable ${label(o.updated)} was changed`;
      case 'rename':
        return `Variable ${label(o.original)} was renamed`;
      case 'replace':
        return `Variable ${label(o.original)} was replaced with ${label(o.updated)}`;
      case 'enum resize':
        return `Type of variable ${label(o.updated)} change its size`;
    }
  }

  hint() {
    switch (this.errorKind) {
      case 'enum resize':
        return `Enums must remain representable in the same integer size`;
      default:
        return undefined;
    }
  }
}

class StorageMatchEnumVariants extends StorageMatchResult {
  errorKind = 'enum variants changed';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(readonly ops: Operation<string, any>[]) {
    super();
  }

  isEqual(): boolean {
    return this.ops.length === 0;
  }

  errorMessage(o: Operation<StorageField, this> & { kind: 'replaced' }) {
    return [
      `Members of ${o.updated.type.item.label} were reordered`,
      this.ops
        .map(q => {
          if (q.kind === 'replaced') {
            return `    - ${q.original} was replaced with ${q.updated}`;
          } else {
            return `    - ${q.updated ?? q.original} was ${q.kind}`;
          }
        })
        .join('\n'),
    ].join('\n');
  }

  hint() {
    return 'Only add new members after the existing ones';
  }
}

export class StorageLayoutComparator {
  // Holds a stack of type comparisons to detect recursion
  stack = new Set<string>();
  cache = new Map<string, StorageMatchResult>();

  // This function is generic because it can compare top level storage layout as well as struct layout.
  getUpgradeErrors<T extends StorageField>(
    original: T[],
    updated: T[],
    { allowAppend }: { allowAppend: boolean },
  ): StorageOperation<T>[] {
    const ops = levenshtein(
      original,
      updated,
      (a, b) => this.matchStorageField(a, b),
      r => r.isEqual(),
    );
    if (allowAppend) {
      // appending is not an error in this case
      return ops.filter(o => o.kind !== 'appended');
    } else {
      return ops;
    }
  }

  matchStorageField(original: StorageField, updated: StorageField): StorageMatchResult {
    const nameMatches = original.label === updated.label;
    const typeMatchResult = this.compatibleTypes(original.type, updated.type, { allowAppend: false });
    const typeMatches = typeMatchResult.isEqual();

    if (typeMatches && nameMatches) {
      return StorageMatchResult.equal;
    } else if (typeMatches) {
      return new StorageMatchError('rename');
    } else if (nameMatches) {
      return typeMatchResult;
    } else {
      return new StorageMatchError('replace');
    }
  }

  compatibleTypes(
    original: ParsedTypeDetailed,
    updated: ParsedTypeDetailed,
    { allowAppend }: { allowAppend: boolean },
  ): StorageMatchResult {
    const key = JSON.stringify({ original: original.id, updated: updated.id, allowAppend });

    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    if (this.stack.has(key)) {
      throw new UpgradesError(`Recursive types are not supported`, () => `Recursion found in ${updated.item.label}\n`);
    }

    try {
      this.stack.add(key);
      const result = this.uncachedCompatibleTypes(original, updated, { allowAppend });
      this.cache.set(key, result);
      return result;
    } finally {
      this.stack.delete(key);
    }
  }

  private uncachedCompatibleTypes(
    original: ParsedTypeDetailed,
    updated: ParsedTypeDetailed,
    { allowAppend }: { allowAppend: boolean },
  ): StorageMatchResult {
    if (original.head !== updated.head) {
      return new StorageMatchError('typechange');
    }

    if (original.args === undefined || updated.args === undefined) {
      // both should be undefined at the same time
      assert(original.args === updated.args);
      return StorageMatchResult.equal;
    }

    const { head } = original;

    if (head === 't_contract') {
      // no storage layout errors can be introduced here since it is just an address
      return StorageMatchResult.equal;
    }

    if (head === 't_struct') {
      const originalMembers = original.item.members;
      const updatedMembers = updated.item.members;
      assert(originalMembers && isStructMembers(originalMembers));
      assert(updatedMembers && isStructMembers(updatedMembers));
      const errors = this.getUpgradeErrors(originalMembers, updatedMembers, { allowAppend });
      if (errors.length === 0) {
        return StorageMatchResult.equal;
      } else {
        return new StorageMatchError('typechange');
      }
    }

    if (head === 't_enum') {
      const originalMembers = original.item.members;
      const updatedMembers = updated.item.members;
      assert(originalMembers && isEnumMembers(originalMembers));
      assert(updatedMembers && isEnumMembers(updatedMembers));
      if (enumSize(originalMembers.length) !== enumSize(updatedMembers.length)) {
        return new StorageMatchError('enum resize');
      } else {
        const ops = levenshtein(originalMembers, updatedMembers, (a, b) => a === b, Boolean);
        const errors = ops.filter(o => o.kind !== 'appended');
        return new StorageMatchEnumVariants(errors);
      }
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
      if (!keyMatches) {
        return new StorageMatchError('typechange');
      } else {
        return this.compatibleTypes(originalValue, updatedValue, { allowAppend: true });
      }
    }

    if (head === 't_array') {
      const originalLength = original.tail?.match(/^(\d+|dyn)/)?.[0];
      const updatedLength = updated.tail?.match(/^(\d+|dyn)/)?.[0];
      assert(originalLength !== undefined && updatedLength !== undefined);
      const compatibleLengths =
        !allowAppend || originalLength === 'dyn' || updatedLength === 'dyn'
          ? originalLength === updatedLength
          : parseInt(updatedLength, 10) >= parseInt(originalLength, 10);
      if (!compatibleLengths) {
        return new StorageMatchError('typechange');
      } else {
        return this.compatibleTypes(original.args[0], updated.args[0], { allowAppend: false });
      }
    }

    // in any other case, conservatively assume not compatible
    return new StorageMatchError('typechange');
  }
}

function enumSize(memberCount: number): number {
  return Math.ceil(Math.log2(Math.max(2, memberCount)) / 8);
}

function label(variable: { label: string }): string {
  return '`' + variable.label + '`';
}
