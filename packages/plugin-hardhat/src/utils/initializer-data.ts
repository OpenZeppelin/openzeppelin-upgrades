import type { Interface } from 'ethers';

export function getInitializerData(
  contractInterface: Interface,
  args: unknown[],
  initializer?: string | false,
): string {
  if (initializer === false) {
    return '0x';
  }

  const allowNoInitialization = initializer === undefined && args.length === 0;
  initializer = initializer ?? 'initialize';

  try {
    const fragment = contractInterface.getFunction(initializer);
    if (fragment === null) {
      throw new Error(`no matching function "${initializer}"`); // TODO see if we can avoid the catch below
    } else {
      return contractInterface.encodeFunctionData(fragment, args);
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (allowNoInitialization && e.message.includes('no matching function')) {
        return '0x';
      }
    }
    throw e;
  }
}
