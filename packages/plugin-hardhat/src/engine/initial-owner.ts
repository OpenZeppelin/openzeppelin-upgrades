import { UpgradesError } from '@openzeppelin/upgrades-core';
import type { EngineBinding } from './binding.js';
import type { InitialOwner } from './options.js';

/**
 * Resolves the initial owner for a transparent proxy or beacon: the explicit `initialOwner`
 * option, or otherwise the address of the binding's signing account.
 */
export async function getInitialOwner(binding: EngineBinding, opts: InitialOwner): Promise<string> {
  const result = opts.initialOwner ?? (await binding.getSignerAddress());
  if (result === undefined) {
    throw new UpgradesError(
      'Initial owner must be specified',
      () => `Set the initial owner address using the \`initialOwner\` option`,
    );
  }
  return result;
}
