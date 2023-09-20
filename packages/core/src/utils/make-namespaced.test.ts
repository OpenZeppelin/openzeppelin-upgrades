import test from 'ava';
import { artifacts } from 'hardhat';

import { makeNamespacedInput } from './make-namespaced';

test('make namespaced input', async t => {
  const origBuildInfo = await artifacts.getBuildInfo('contracts/test/NamespacedToModify.sol:Example');
  if (origBuildInfo === undefined) {
    throw new Error('Build info not found');
  }

  const modifiedInput = makeNamespacedInput(origBuildInfo.input, origBuildInfo.output);
  t.snapshot(modifiedInput);
});
