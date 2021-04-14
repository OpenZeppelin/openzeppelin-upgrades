import chalk from 'chalk';

export * from './compat';

import { UpgradesError } from '../error';
import { StorageLayout, getDetailedLayout } from './layout';
import { StorageOperation, StorageItem, StorageLayoutComparator } from './compare';
import { LayoutCompatibilityReport } from './report';
import { ValidationOptions, isSilencingWarnings } from '../validate/overrides';
import { logWarning } from '../utils/log';

export function assertStorageUpgradeSafe(
  original: StorageLayout,
  updated: StorageLayout,
  unsafeAllowCustomTypes = false,
): void {
  const originalDetailed = getDetailedLayout(original);
  const updatedDetailed = getDetailedLayout(updated);
  const comparator = new StorageLayoutComparator(unsafeAllowCustomTypes);
  const report = comparator.compareLayouts(originalDetailed, updatedDetailed);

  if (!isSilencingWarnings()) {
    if (comparator.hasAllowedUncheckedCustomTypes) {
      logWarning(`Potentially unsafe deployment`, [
        `You are using \`unsafeAllowCustomTypes\` to force approve structs or enums with missing data.`,
        `Make sure you have manually checked the storage layout for incompatibilities.`,
      ]);
    } else if (unsafeAllowCustomTypes) {
      console.error(
        chalk.keyword('yellow').bold('Note:') +
          ` \`unsafeAllowCustomTypes\` is no longer necessary. Structs are enums are automatically checked.\n`,
      );
    }
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
    assertStorageUpgradeSafe(original, updated, opts.unsafeAllowCustomTypes);
  } catch (e) {
    if (e instanceof StorageUpgradeErrors) {
      return e.report.ops;
    } else {
      throw e;
    }
  }
  return [];
}
