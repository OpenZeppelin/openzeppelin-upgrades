export * from './compat';

import { UpgradesError } from '../error';
import { StorageLayout, getDetailedLayout } from './layout';
import { StorageOperation, StorageItem, StorageLayoutComparator } from './compare';
import { LayoutCompatibilityReport } from './report';
import { ValidationOptions, withValidationDefaults } from '../validate/overrides';
import { logNote, logWarning } from '../utils/log';
import { normalizeUint256Literal } from '../utils/integer-literals';

export function assertStorageUpgradeSafe(
  original: StorageLayout,
  updated: StorageLayout,
  unsafeAllowCustomTypes: boolean,
): void;

export function assertStorageUpgradeSafe(
  original: StorageLayout,
  updated: StorageLayout,
  opts: Required<ValidationOptions>,
): void;

export function assertStorageUpgradeSafe(
  original: StorageLayout,
  updated: StorageLayout,
  opts: Required<ValidationOptions> | boolean = false,
): void {
  if (typeof opts === 'boolean') {
    const unsafeAllowCustomTypes = opts;
    opts = withValidationDefaults({ unsafeAllowCustomTypes });
  }

  const report = getStorageUpgradeReport(original, updated, opts);

  if (!report.pass) {
    throw new StorageUpgradeErrors(report);
  }
}

function validateBaseSlotUnchanged(original: StorageLayout, updated: StorageLayout) {
  const origNormalized = normalizeUint256Literal(original.baseSlot);
  const updatedNormalized = normalizeUint256Literal(updated.baseSlot);

  if (origNormalized !== updatedNormalized) {
    throw new UpgradesError(
      `Base slot for custom storage layout changed from ${origNormalized} to ${updatedNormalized}`,
      () => `\
Do not change the base slot during upgrades when using custom storage layout.

If you need to change the base slot, ensure you also do the following:
1. Adjust all storage variables to continue using their original slots.
2. Configure your Solidity compiler options to include storage layouts according to https://docs.openzeppelin.com/upgrades-plugins/api-core#compile_contracts_with_storage_layouts
3. Recompile both the original and updated contracts.
4. Run the storage layout check again.`,
    );
  }
}

export function getStorageUpgradeReport(
  original: StorageLayout,
  updated: StorageLayout,
  opts: Required<ValidationOptions>,
): LayoutCompatibilityReport {
  if (opts.unsafeSkipStorageCheck) {
    return new LayoutCompatibilityReport([]);
  }

  if (original.storage.some(item => item.slot === undefined) || updated.storage.some(item => item.slot === undefined)) {
    // Compiler was not configured to output detailed storage layout with slot information
    validateBaseSlotUnchanged(original, updated);
  }

  const originalDetailed = getDetailedLayout(original);
  const updatedDetailed = getDetailedLayout(updated);
  const originalDetailedNamespaces = getDetailedNamespacedLayout(original);
  const updatedDetailedNamespaces = getDetailedNamespacedLayout(updated);

  const comparator = new StorageLayoutComparator(opts.unsafeAllowCustomTypes, opts.unsafeAllowRenames);
  const report = comparator.compareLayouts(
    originalDetailed,
    updatedDetailed,
    originalDetailedNamespaces,
    updatedDetailedNamespaces,
  );

  if (comparator.hasAllowedUncheckedCustomTypes) {
    logWarning(`Potentially unsafe deployment`, [
      `You are using \`unsafeAllowCustomTypes\` to force approve structs or enums with missing data.`,
      `Make sure you have manually checked the storage layout for incompatibilities.`,
    ]);
  } else if (opts.unsafeAllowCustomTypes) {
    logNote(`\`unsafeAllowCustomTypes\` is no longer necessary. Structs are enums are automatically checked.\n`);
  }

  return report;
}

function getDetailedNamespacedLayout(layout: StorageLayout): Record<string, StorageItem[]> {
  const detailedNamespaces: Record<string, StorageItem[]> = {};
  if (layout.namespaces !== undefined) {
    for (const [storageLocation, namespacedLayout] of Object.entries(layout.namespaces)) {
      detailedNamespaces[storageLocation] = getDetailedLayout({
        storage: namespacedLayout,
        types: layout.types,
      });
    }
  }
  return detailedNamespaces;
}

export class StorageUpgradeErrors extends UpgradesError {
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
    assertStorageUpgradeSafe(original, updated, withValidationDefaults(opts));
  } catch (e) {
    if (e instanceof StorageUpgradeErrors) {
      return e.report.ops;
    } else {
      throw e;
    }
  }
  return [];
}
