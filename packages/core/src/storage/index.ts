import chalk from 'chalk';

export * from './compat';

import { UpgradesError } from '../error';
import { StorageLayout, getDetailedLayout } from './layout';
import { StorageOperation, StorageItem, StorageLayoutComparator } from './compare';
import { LayoutCompatibilityReport } from './report';
import { ValidationOptions, isSilencingWarnings } from '../validate/overrides';

export function assertStorageUpgradeSafe(
  original: StorageLayout,
  updated: StorageLayout,
  opts: ValidationOptions = {},
): void {
  const originalDetailed = getDetailedLayout(original);
  const updatedDetailed = getDetailedLayout(updated);
  const comparator = new StorageLayoutComparator(opts);
  const report = comparator.compareLayouts(originalDetailed, updatedDetailed);

  if (comparator.hasAllowedUncheckedCustomTypes && !isSilencingWarnings()) {
    console.error(
      '\n' +
        chalk.keyword('orange').bold('Warning: ') +
        `Potentially unsafe deployment\n\n` +
        `    You are using \`unsafeAllowCustomTypes\` to force approve structs or enums with missing data.\n` +
        `    Make sure you have manually checked the storage layout for incompatibilities.\n`,
    );
  }

  if (!report.pass) {
    throw new StorageUpgradeErrors(report);
  }
}

class StorageUpgradeErrors extends UpgradesError {
  constructor(readonly report: LayoutCompatibilityReport) {
    super(`New storage layout is incompatible`, () => report.explain());
  }
}

// Kept for backwards compatibility and to avoid rewriting tests
export function getStorageUpgradeErrors(
  original: StorageLayout,
  updated: StorageLayout,
  opts: ValidationOptions = {},
): StorageOperation<StorageItem>[] {
  try {
    assertStorageUpgradeSafe(original, updated, opts);
  } catch (e) {
    if (e instanceof StorageUpgradeErrors) {
      return e.report.ops;
    } else {
      throw e;
    }
  }
  return [];
}
