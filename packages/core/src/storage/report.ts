import chalk from 'chalk';

import type { BasicOperation } from '../levenshtein';
import type { ParsedTypeDetailed } from './layout';
import type { StorageOperation, StorageItem, StorageField, TypeChange, EnumOperation } from './compare';
import { itemize } from '../utils/itemize';
import { assert } from '../utils/assert';

export class LayoutCompatibilityReport {
  readonly pass: boolean;

  constructor(readonly ops: StorageOperation<StorageItem>[]) {
    this.pass = ops.length === 0;
  }

  explain(): string {
    const res = [];

    for (const op of this.ops) {
      const src = 'updated' in op ? op.updated.src : op.original.contract;
      res.push(chalk.bold(src) + ': ' + explainStorageOperation(op, true));
    }

    return res.join('\n\n');
  }
}

function explainStorageOperation(op: StorageOperation<StorageField>, withDetails: boolean): string {
  switch (op.kind) {
    case 'typechange': {
      const basic = explainTypeChange(op.change);
      const details = withDetails
        ? new Set(
            getAllTypeChanges(op.change)
              .map(explainTypeChangeDetails)
              .filter((d?: string): d is string => d !== undefined),
          )
        : [];
      return `Upgraded ${label(op.updated)} to an incompatible type\n` + itemize(basic, ...details);
    }

    case 'rename':
      return `Renamed ${label(op.original)} to ${label(op.updated)}`;

    case 'replace':
      return `Replaced ${label(op.original)} with ${label(op.updated)} of incompatible type`;

    default: {
      const lines = [explainBasicOperation(op, t => t.label)];

      switch (op.kind) {
        case 'insert': {
          lines.push('Only insert variables at the end of the last contract in the inheritance');
          break;
        }

        case 'delete': {
          lines.push('Keep the variable even if unused');
          break;
        }
      }

      return lines.join('\n');
    }
  }
}

function explainTypeChange(ch: TypeChange): string {
  switch (ch.kind) {
    case 'obvious mismatch':
    case 'struct members':
    case 'enum members':
      return `Bad upgrade ${describeTransition(ch.original, ch.updated)}`;

    case 'enum resize':
      return `Bad upgrade ${describeTransition(ch.original, ch.updated)}\nDifferent representation sizes`;

    case 'mapping key': {
      assert(ch.original.args && ch.updated.args);
      const originalKey = ch.original.args[0];
      const updatedKey = ch.updated.args[0];
      return `In key of ${ch.updated.item.label}\n- Bad upgrade ${describeTransition(originalKey, updatedKey)}`;
    }

    case 'mapping value':
    case 'array value':
      return `In ${ch.updated.item.label}\n` + itemize(explainTypeChange(ch.inner));

    case 'array shrink':
    case 'array grow': {
      assert(ch.original.tail && ch.updated.tail);
      const originalSize = parseInt(ch.original.tail, 10);
      const updatedSize = parseInt(ch.updated.tail, 10);
      const note = ch.kind === 'array shrink' ? 'Size cannot decrease' : 'Size cannot increase here';
      return `Bad array resize from ${originalSize} to ${updatedSize}\n${note}`;
    }

    case 'array dynamic': {
      assert(ch.original.tail && ch.updated.tail);
      const [originalSize, updatedSize] = ch.original.tail === 'dyn' ? ['dynamic', 'fixed'] : ['fixed', 'dynamic'];
      return `Bad upgrade from ${originalSize} to ${updatedSize} size array`;
    }

    case 'missing members': {
      const type = ch.updated.head.replace(/^t_/, ''); // t_struct, t_enum -> struct, enum
      return `Insufficient data to compare ${type}s\nManually assess compatibility, then use option \`unsafeAllowCustomTypes: true\``;
    }

    case 'unknown':
      return `Unknown type ${ch.updated.item.label}`;
  }
}

function getAllTypeChanges(root: TypeChange): TypeChange[] {
  const list = [root];

  for (const ch of list) {
    switch (ch.kind) {
      case 'mapping value':
      case 'array value':
        list.push(ch.inner);
        break;

      case 'struct members': {
        for (const op of ch.ops) {
          if (op.kind === 'typechange') {
            list.push(op.change);
          }
        }
        break;
      }

      // We mention all other kinds explicitly to review any future new kinds
      case 'obvious mismatch':
      case 'enum members':
      case 'enum resize':
      case 'mapping key':
      case 'array shrink':
      case 'array grow':
      case 'array dynamic':
      case 'missing members':
      case 'unknown':
        break;
    }
  }

  return list;
}

function explainTypeChangeDetails(ch: TypeChange): string | undefined {
  switch (ch.kind) {
    case 'struct members':
      return `In ${ch.updated.item.label}\n` + itemize(...ch.ops.map(op => explainStorageOperation(op, false)));

    case 'enum members':
      return `In ${ch.updated.item.label}\n` + itemize(...ch.ops.map(explainEnumOperation));
  }
}

function explainEnumOperation(op: EnumOperation): string {
  switch (op.kind) {
    case 'replace':
      return `Replaced \`${op.original}\` with \`${op.updated}\``;

    default:
      return explainBasicOperation(op, t => t);
  }
}

function explainBasicOperation<T>(op: BasicOperation<T>, getName: (t: T) => string): string {
  switch (op.kind) {
    case 'delete':
      return `Deleted \`${getName(op.original)}\``;

    case 'insert':
      return `Inserted \`${getName(op.updated)}\``;

    case 'append':
      return `Added \`${getName(op.updated)}\``;
  }
}

function describeTransition(original: ParsedTypeDetailed, updated: ParsedTypeDetailed): string {
  const originalLabel = original.item.label;
  const updatedLabel = updated.item.label;

  if (originalLabel === updatedLabel) {
    return `to ${updatedLabel}`;
  } else {
    return `from ${originalLabel} to ${updatedLabel}`;
  }
}

function label(variable: { label: string }): string {
  return '`' + variable.label + '`';
}
