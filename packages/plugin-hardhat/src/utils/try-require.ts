import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);

/**
 * Returns true if `id` can be resolved (and optionally loaded) from this package.
 * With `resolveOnly`, only the module path is resolved — the module body is not executed.
 * Mirrors the HH2 plugin's helper of the same name.
 */
export function tryRequire(id: string, resolveOnly?: boolean): boolean {
  try {
    resolveOnly ? nodeRequire.resolve(id) : nodeRequire(id);
    return true;
  } catch {
    // do nothing
  }
  return false;
}
