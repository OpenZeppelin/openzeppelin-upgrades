import './type-extensions-config.js';
import { overrideTask } from 'hardhat/config';
import type { HardhatPlugin } from 'hardhat/types/plugins';

// A no-op plugin used when @nomicfoundation/hardhat-ethers is not installed, so that a viem-only
// project loads this plugin without crashing on the missing optional dependency.
const noopPlugin: HardhatPlugin = {
  id: '@openzeppelin/hardhat-upgrades/optional-hardhat-ethers',
};

/**
 * The shared Hardhat plugin object for the `plugins` array of a Hardhat config. It lives in its
 * own module with a client-neutral type chain so it can be re-exported from the `/viem` entry
 * point without requiring @nomicfoundation/hardhat-ethers.
 */
const plugin: HardhatPlugin = {
  id: '@openzeppelin/hardhat-upgrades',

  hookHandlers: {
    config: () => import('./hooks/config.js'),
    solidity: () => import('./hooks/solidity.js'),
  },

  // Auto-load @nomicfoundation/hardhat-ethers when it is installed, preserving the no-registration
  // UX for ethers users, while degrading gracefully to a no-op for viem-only projects that do not
  // install it (it is now an optional peer dependency).
  //
  // Conditional dependencies aren't a fit here: they only activate when another plugin the user
  // already registered is present (as with hardhat-verify below), not when a package is merely
  // installed, and they silently ignore load errors, so a broken ethers install would be
  // indistinguishable from ethers being absent.
  dependencies: () => [
    import('@nomicfoundation/hardhat-ethers')
      .then(m => ({ default: m.default }))
      .catch(e => {
        // Only treat a missing optional peer as "not installed". Surface any other failure (e.g. a
        // corrupt or version-incompatible install, or a throwing import) instead of masking it as
        // the package being absent, which would misdirect the user to reinstall something present.
        if (e?.code === 'ERR_MODULE_NOT_FOUND' || e?.code === 'MODULE_NOT_FOUND') {
          return { default: noopPlugin };
        }
        throw e;
      }),
  ],

  // Load our hardhat-verify integration only when the user has registered hardhat-verify (see the
  // note on dependencies above for why ethers can't use this mechanism).
  conditionalDependencies: [
    {
      condition: () => [import('@nomicfoundation/hardhat-verify').then(m => ({ default: m.default }))],
      plugin: () => import('./verify-plugin.js'),
    },
  ],

  tasks: [
    // Force a full recompile when the validations cache is outdated or missing,
    // so that the cache is regenerated transparently after a schema bump.
    // Hardhat 3 registers `compile` and `build` as separate task IDs pointing at
    // the same action, so we override both.
    overrideTask('compile')
      .setAction(async () => import('./compile-task-action.js'))
      .build(),
    overrideTask('build')
      .setAction(async () => import('./compile-task-action.js'))
      .build(),
  ],
};

export default plugin;
