import test from 'ava';
import { artifacts } from 'hardhat';

import { makeNamespacedInput } from './make-namespaced';

test('make namespaced input', async t => {
  const origBuildInfo = await artifacts.getBuildInfo('contracts/test/NamespacedToModify.sol:Example');
  if (origBuildInfo === undefined) {
    throw new Error('Build info not found');
  }

  // Inefficient, but we want to test that we don't actually modify the original input object
  const origInput = JSON.parse(JSON.stringify(origBuildInfo.input));

  const modifiedInput = makeNamespacedInput(origBuildInfo.input, origBuildInfo.output);
  t.snapshot(modifiedInput);

  t.deepEqual(origBuildInfo.input, origInput);
  t.notDeepEqual(modifiedInput, origInput);
});
