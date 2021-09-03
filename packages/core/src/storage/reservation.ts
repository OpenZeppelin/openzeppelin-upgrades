import { assert } from '../utils/assert';
import debug from '../utils/debug';
import { ParsedTypeDetailed, StorageItem as _StorageItem } from './layout';

enum StorageSlotState {
  Occupied = 1,
  Reserved, // reserved slot by `_gap` field
}

export type StorageItem = _StorageItem<ParsedTypeDetailed>;
type StorageSlot = {
  state: StorageSlotState;
  ref?: string;
};

const GAP_LABEL = '_gap';

export function compareLayouts(original: StorageItem[], updated: StorageItem[]): void {
  const storageMap: Array<StorageSlot[]> = [[], []];
  let originalIndex = 0;
  let updatedIndex = 0;

  // create original map
  for (const item of original) {
    const size = getSize(item);
    const state = item.label.toLowerCase().endsWith(GAP_LABEL)
      ? { state: StorageSlotState.Reserved }
      : { state: StorageSlotState.Occupied, ref: getRef(item) };
    for (let i = 0; i < size; i++) {
      storageMap[0][originalIndex] = state;
      originalIndex += 1;
    }
  }

  // create updated map
  for (const item of updated) {
    const size = getSize(item);
    for (let i = 0; i < size; i++) {
      storageMap[1][updatedIndex] = { state: StorageSlotState.Occupied, ref: getRef(item) };
      updatedIndex += 1;
    }
  }

  // do not allow to shrink layout
  if (originalIndex > updatedIndex) {
    throw new Error('Storage layout shrink');
  }

  // validate storage layout update
  for (let i = 0; i < updatedIndex; i++) {
    const originalSlot = storageMap[0][i];
    const updatedSlot = storageMap[1][i];
    debug(originalSlot?.ref + ' -> ' + updatedSlot?.ref);

    if (!originalSlot && updatedSlot.state === StorageSlotState.Occupied) {
      // detect storage overgrowth (storage append)
      throw new Error('Storage layout overgrowth');
    }

    if (
      originalSlot.state === StorageSlotState.Occupied &&
      updatedSlot.state === StorageSlotState.Occupied &&
      originalSlot.ref !== updatedSlot.ref
    ) {
      // detect storage inconsistency
      throw new Error('Storage layout breage');
    }
  }
}

// TODO: add all data types
function getSize(item: StorageItem): number {
  switch (item.type.head) {
    case 't_array': {
      const originalLength = item.type.tail?.match(/^(\d+|dyn)/)?.[0];
      assert(originalLength !== undefined);

      return originalLength === 'dyn' ? 1 : Number(originalLength);
    }
    default:
      return 1;
  }
}

function getRef(item: StorageItem): string {
  return `${item.label}:${item.type.id}`;
}
