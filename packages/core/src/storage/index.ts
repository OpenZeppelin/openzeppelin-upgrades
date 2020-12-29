import chalk from 'chalk';

import { UpgradesError, ErrorDescriptions } from '../error';
import { StorageLayout, getDetailedLayout } from './layout';
import { StorageOperation, StorageLayoutComparator } from './compare';

export function assertStorageUpgradeSafe(original: StorageLayout, updated: StorageLayout): void {
  const errors = getStorageUpgradeErrors(original, updated);
  if (errors.length > 0) {
    throw new StorageUpgradeErrors(errors);
  }
}

class StorageUpgradeErrors extends UpgradesError {
  constructor(readonly errors: StorageOperation[]) {
    super(`New storage layout is incompatible`, () => {
      return errors.map(describeError).join('\n\n');
    });
  }
}

export function getStorageUpgradeErrors(original: StorageLayout, updated: StorageLayout): StorageOperation[] {
  const originalDetailed = getDetailedLayout(original);
  const updatedDetailed = getDetailedLayout(updated);
  return new StorageLayoutComparator().getUpgradeErrors(originalDetailed, updatedDetailed, { allowAppend: true });
}

function label(variable: { label: string }): string {
  return '`' + variable.label + '`';
}

const errorInfo: ErrorDescriptions<StorageOperation> = {
  replaced: {
    msg: o => o.result.errorMessage(o),
    hint: o => o.result.hint(),
  },
  inserted: {
    msg: o => `Inserted variable ${label(o.updated)}`,
    hint: () => 'Only insert variables at the end of the most derived contract',
  },
  deleted: {
    msg: o => `Deleted variable ${label(o.original)}`,
    hint: () => 'Keep the variable even if unused',
  },
  appended: {
    // this would not be shown to the user but TypeScript needs append here
    msg: () => 'Appended a variable but it is not an error',
  },
};

export function describeError(e: StorageOperation): string {
  const info = errorInfo[e.kind];
  const src = e.updated ? e.updated.src : e.original.contract;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const log = [chalk.bold(src) + ': ' + info.msg(e as any)];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hint = info.hint?.(e as any);
  if (hint) {
    log.push(hint);
  }
  if (info.link) {
    log.push(chalk.dim(info.link));
  }
  return log.join('\n    ');
}
