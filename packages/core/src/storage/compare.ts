import { levenshtein, Operation } from '../levenshtein';
import { ParsedTypeDetailed, StorageItem as _StorageItem } from './layout';
import { UpgradesError } from '../error';
import { StructMember as _StructMember, isEnumMembers, isStructMembers } from './layout';
import { LayoutCompatibilityReport } from './report';
import { assert } from '../utils/assert';
import { isValueType } from '../utils/is-value-type';

export type StorageItem = _StorageItem<ParsedTypeDetailed>;
type StructMember = _StructMember<ParsedTypeDetailed>;

export type StorageField = StorageItem | StructMember;
export type StorageOperation<F extends StorageField> = Operation<F, StorageFieldChange<F>>;

export type EnumOperation = Operation<string, { kind: 'replace'; original: string; updated: string }>;

type StorageFieldChange<F extends StorageField> = (
  | { kind: 'replace' | 'rename' }
  | { kind: 'typechange'; change: TypeChange }
) & {
  original: F;
  updated: F;
};

export type TypeChange = (
  | {
      kind:
        | 'obvious mismatch'
        | 'unknown'
        | 'array grow'
        | 'array shrink'
        | 'array dynamic'
        | 'enum resize'
        | 'missing members';
    }
  | {
      kind: 'mapping key' | 'mapping value' | 'array value';
      inner: TypeChange;
    }
  | {
      kind: 'enum members';
      ops: EnumOperation[];
    }
  | {
      kind: 'struct members';
      ops: StorageOperation<StructMember>[];
      allowAppend: boolean;
    }
) & {
  original: ParsedTypeDetailed;
  updated: ParsedTypeDetailed;
};

export class StorageLayoutComparator {
  hasAllowedUncheckedCustomTypes = false;

  // Holds a stack of type comparisons to detect recursion
  stack = new Set<string>();
  cache = new Map<string, TypeChange | undefined>();

  constructor(readonly unsafeAllowCustomTypes = false, readonly unsafeAllowRenames = false) {}

  compareLayouts(original: StorageItem[], updated: StorageItem[]): LayoutCompatibilityReport {
    return new LayoutCompatibilityReport(this.layoutLevenshtein(original, updated, { allowAppend: true }));
  }

  private layoutLevenshtein<F extends StorageField>(
    original: F[],
    updated: F[],
    { allowAppend }: { allowAppend: boolean },
  ): StorageOperation<F>[] {
    const ops = levenshtein(original, updated, (a, b) => this.getFieldChange(a, b));

    if (allowAppend) {
      return ops.filter(o => o.kind !== 'append');
    } else {
      return ops;
    }
  }

  getFieldChange<F extends StorageField>(original: F, updated: F): StorageFieldChange<F> | undefined {
    const nameChange = !this.unsafeAllowRenames && original.label !== updated.label;
    const typeChange = this.getTypeChange(original.type, updated.type, { allowAppend: false });

    if (typeChange && nameChange) {
      return { kind: 'replace', original, updated };
    } else if (nameChange) {
      return { kind: 'rename', original, updated };
    } else if (typeChange) {
      return { kind: 'typechange', change: typeChange, original, updated };
    }
  }

  getTypeChange(
    original: ParsedTypeDetailed,
    updated: ParsedTypeDetailed,
    { allowAppend }: { allowAppend: boolean },
  ): TypeChange | undefined {
    const key = JSON.stringify({ original: original.id, updated: updated.id, allowAppend });

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    if (this.stack.has(key)) {
      throw new UpgradesError(`Recursive types are not supported`, () => `Recursion found in ${updated.item.label}\n`);
    }

    try {
      this.stack.add(key);
      const result = this.uncachedGetTypeChange(original, updated, { allowAppend });
      this.cache.set(key, result);
      return result;
    } finally {
      this.stack.delete(key);
    }
  }

  private uncachedGetTypeChange(
    original: ParsedTypeDetailed,
    updated: ParsedTypeDetailed,
    { allowAppend }: { allowAppend: boolean },
  ): TypeChange | undefined {
    if (original.head !== updated.head) {
      return { kind: 'obvious mismatch', original, updated };
    }

    if (original.args === undefined || updated.args === undefined) {
      // both should be undefined at the same time
      assert(original.args === updated.args);
      return undefined;
    }

    switch (original.head) {
      case 't_contract':
        // no storage layout errors can be introduced here since it is just an address
        return undefined;

      case 't_struct': {
        const originalMembers = original.item.members;
        const updatedMembers = updated.item.members;
        if (originalMembers === undefined || updatedMembers === undefined) {
          if (this.unsafeAllowCustomTypes) {
            this.hasAllowedUncheckedCustomTypes = true;
            return undefined;
          } else {
            return { kind: 'missing members', original, updated };
          }
        }
        assert(isStructMembers(originalMembers) && isStructMembers(updatedMembers));
        const ops = this.layoutLevenshtein(originalMembers, updatedMembers, { allowAppend });
        if (ops.length > 0) {
          return { kind: 'struct members', ops, original, updated, allowAppend };
        } else {
          return undefined;
        }
      }

      case 't_enum': {
        const originalMembers = original.item.members;
        const updatedMembers = updated.item.members;
        if (originalMembers === undefined || updatedMembers === undefined) {
          if (this.unsafeAllowCustomTypes) {
            this.hasAllowedUncheckedCustomTypes = true;
            return undefined;
          } else {
            return { kind: 'missing members', original, updated };
          }
        }
        assert(isEnumMembers(originalMembers) && isEnumMembers(updatedMembers));
        if (enumSize(originalMembers.length) !== enumSize(updatedMembers.length)) {
          return { kind: 'enum resize', original, updated };
        } else {
          const ops = levenshtein(originalMembers, updatedMembers, (a, b) =>
            a === b ? undefined : { kind: 'replace' as const, original: a, updated: b },
          ).filter(o => o.kind !== 'append');
          if (ops.length > 0) {
            return { kind: 'enum members', ops, original, updated };
          } else {
            return undefined;
          }
        }
      }

      case 't_mapping': {
        const [originalKey, originalValue] = original.args;
        const [updatedKey, updatedValue] = updated.args;

        // validate an invariant we assume from solidity: key types are always simple value types
        assert(isValueType(originalKey) && isValueType(updatedKey));

        // network files migrated from the OZ CLI have an unknown key type
        // we allow it to match with any other key type, carrying over the semantics of OZ CLI
        const keyChange =
          originalKey.head === 'unknown'
            ? undefined
            : this.getTypeChange(originalKey, updatedKey, { allowAppend: false });

        if (keyChange) {
          return { kind: 'mapping key', inner: keyChange, original, updated };
        } else {
          // mapping value types are allowed to grow
          const inner = this.getTypeChange(originalValue, updatedValue, { allowAppend: true });
          if (inner) {
            return { kind: 'mapping value', inner, original, updated };
          } else {
            return undefined;
          }
        }
      }

      case 't_array': {
        const originalLength = original.tail?.match(/^(\d+|dyn)/)?.[0];
        const updatedLength = updated.tail?.match(/^(\d+|dyn)/)?.[0];
        assert(originalLength !== undefined && updatedLength !== undefined);

        if (originalLength === 'dyn' || updatedLength === 'dyn') {
          if (originalLength !== updatedLength) {
            return { kind: 'array dynamic', original, updated };
          }
        }

        const originalLengthInt = parseInt(originalLength, 10);
        const updatedLengthInt = parseInt(updatedLength, 10);

        if (updatedLengthInt < originalLengthInt) {
          return { kind: 'array shrink', original, updated };
        } else if (!allowAppend && updatedLengthInt > originalLengthInt) {
          return { kind: 'array grow', original, updated };
        }

        const inner = this.getTypeChange(original.args[0], updated.args[0], { allowAppend: false });

        if (inner) {
          return { kind: 'array value', inner, original, updated };
        } else {
          return undefined;
        }
      }

      default:
        return { kind: 'unknown', original, updated };
    }
  }
}

function enumSize(memberCount: number): number {
  return Math.ceil(Math.log2(Math.max(2, memberCount)) / 8);
}
