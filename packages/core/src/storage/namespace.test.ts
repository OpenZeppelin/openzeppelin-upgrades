import test from 'ava';
import { artifacts } from 'hardhat';

import { makeNamespacedInputCopy } from './namespace';

test('make namespaced input copy', async t => {
  const origBuildInfo = await artifacts.getBuildInfo('contracts/test/NamespacedToModify.sol:Example');
  if (origBuildInfo === undefined) {
    throw new Error('Build info not found');
  }

  const modifiedInput = makeNamespacedInputCopy(origBuildInfo.input, origBuildInfo.output);
  t.snapshot(modifiedInput);
});
