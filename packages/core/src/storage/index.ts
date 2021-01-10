import { UpgradesError } from '../error';
import { StorageLayout, getDetailedLayout } from './layout';
import { StorageOperation, StorageItem, StorageLayoutComparator } from './compare';
import { LayoutCompatibilityReport } from './report';

export function assertStorageUpgradeSafe(original: StorageLayout, updated: StorageLayout): void {
  const originalDetailed = getDetailedLayout(original);
  const updatedDetailed = getDetailedLayout(updated);
  const report = new StorageLayoutComparator().compareLayouts(originalDetailed, updatedDetailed);
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
): StorageOperation<StorageItem>[] {
  try {
    assertStorageUpgradeSafe(original, updated);
  } catch (e) {
    if (e instanceof StorageUpgradeErrors) {
      return e.report.ops;
    } else {
      throw e;
    }
  }
  return [];
}
