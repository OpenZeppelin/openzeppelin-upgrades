import { Signer } from 'ethers';
import { InitialOwner } from './options';
import { UpgradesError } from '@openzeppelin/upgrades-core';

export async function getInitialOwner(opts: InitialOwner, signer?: Signer) {
  const result = opts.initialOwner ?? (await signer?.getAddress()) ?? undefined;
  if (result === undefined) {
    throw new UpgradesError(
      'Initial owner must be specified',
      () => `Set the initial owner address using the \`initialOwner\` option`,
    );
  }
  return result;
}
