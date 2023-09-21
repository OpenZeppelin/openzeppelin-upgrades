import test from 'ava';
import { artifacts, run } from 'hardhat';
import {
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
  TASK_COMPILE_SOLIDITY_RUN_SOLC,
  TASK_COMPILE_SOLIDITY_RUN_SOLCJS,
} from 'hardhat/builtin-tasks/task-names';

import { makeNamespacedInput } from './make-namespaced';
import { SolcBuild } from 'hardhat/types/builtin-tasks';
import { SolcInput, SolcOutput } from '../solc-api';

test('make namespaced input', async t => {
  const origBuildInfo = await artifacts.getBuildInfo('contracts/test/NamespacedToModify.sol:Example');
  if (origBuildInfo === undefined) {
    throw new Error('Build info not found');
  }

  // Inefficient, but we want to test that we don't actually modify the original input object
  const origInput = JSON.parse(JSON.stringify(origBuildInfo.input));

  const modifiedInput = makeNamespacedInput(origBuildInfo.input, origBuildInfo.output);
  normalizeStateVariableNames(modifiedInput);
  t.snapshot(modifiedInput);

  t.deepEqual(origBuildInfo.input, origInput);
  t.notDeepEqual(modifiedInput, origInput);

  // Run hardhat compile on the modified input and make sure it has no errors
  const modifiedOutput = await hardhatCompile(modifiedInput);
  t.is(modifiedOutput.errors, undefined);
});

function normalizeStateVariableNames(input: SolcInput): void {
  for (const source of Object.values(input.sources)) {
    if (source.content !== undefined) {
      source.content = source.content.replace(/\$MainStorage_\d{1,6};/g, '$MainStorage_random;');
    }
  }
}

async function hardhatCompile(input: SolcInput): Promise<SolcOutput> {
  const solcBuild: SolcBuild = await run(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, {
    quiet: true,
    solcVersion: '0.8.20',
  });

  if (solcBuild.isSolcJs) {
    return await run(TASK_COMPILE_SOLIDITY_RUN_SOLCJS, {
      input,
      solcJsPath: solcBuild.compilerPath,
    });
  } else {
    return await run(TASK_COMPILE_SOLIDITY_RUN_SOLC, {
      input,
      solcPath: solcBuild.compilerPath,
    });
  }
}
