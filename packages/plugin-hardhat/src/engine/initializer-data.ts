import { UpgradesError } from '@openzeppelin/upgrades-core';
import type { Abi, EngineBinding } from './binding.js';
import type { Call } from './options.js';

/**
 * Encodes the initializer call for a proxy deployment, using the binding's own ABI encoder.
 * Mirrors the resolution rules of the ethers-based implementation: an explicit `false` omits
 * the call, a missing initializer with no arguments is allowed to be omitted, and otherwise the
 * function (matched by name or signature) must exist.
 */
export function getInitializerData(
  binding: EngineBinding,
  abi: Abi,
  args: readonly unknown[],
  initializer?: string | false,
): string {
  if (initializer === false) {
    return '0x';
  }

  const allowNoInitialization = initializer === undefined && args.length === 0;
  initializer = initializer ?? 'initialize';

  if (!binding.hasFunction(abi, initializer)) {
    if (allowNoInitialization) {
      return '0x';
    }
    throw new UpgradesError(
      `The contract has no initializer function matching the name or signature: ${initializer}`,
      () =>
        `Ensure that the initializer function exists, specify an existing function with the 'initializer' option, or set the 'initializer' option to false to omit the initializer call.`,
    );
  }
  return binding.encodeFunctionData(abi, initializer, args);
}

/**
 * Encodes the optional `call` for `upgradeProxy`, or returns `undefined` when there is none.
 */
export function encodeCall(binding: EngineBinding, abi: Abi, call: Call | undefined): string | undefined {
  if (!call) {
    return undefined;
  }
  if (typeof call === 'string') {
    call = { fn: call };
  }
  return binding.encodeFunctionData(abi, call.fn, call.args ?? []);
}
