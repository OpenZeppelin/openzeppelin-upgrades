import test, { ExecutionContext } from 'ava';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { rimraf } from 'rimraf';
import { artifacts, run } from 'hardhat';
import {
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
  TASK_COMPILE_SOLIDITY_RUN_SOLC,
  TASK_COMPILE_SOLIDITY_RUN_SOLCJS,
} from 'hardhat/builtin-tasks/task-names';
import { SolcBuild } from 'hardhat/types/builtin-tasks';

import { SolcInput, SolcOutput } from '../../solc-api';
import { getSolcCacheDir, setSolcCacheDirForTesting } from './namespaced-compilation';
import { validateUpgradeSafety } from './validate-upgrade-safety';

const fixture = 'contracts/test/cli/NamespacedSlots.sol';
const NOTE = 'Namespaced storage was checked without a detailed storage layout';

const originalFetch = globalThis.fetch;
let fetchCalls: string[];
let tempDir: string | undefined;
let cacheDir: string;

test.before(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-'));
  process.chdir(tempDir);
  cacheDir = path.join(tempDir, 'solc-cache');
});

test.beforeEach(async () => {
  // Network access fails, so tests put the compiler from the solc-0.8.29 dev dependency in the cache
  fetchCalls = [];
  globalThis.fetch = async (input: string | URL | Request) => {
    fetchCalls.push(input.toString());
    throw new Error('Network access is disabled in this test');
  };
  setSolcCacheDirForTesting(cacheDir);
  await rimraf(cacheDir);
});

test.after.always(async () => {
  globalThis.fetch = originalFetch;
  setSolcCacheDirForTesting(undefined);
  // This also runs if the setup failed, so the current folder may not be the temporary folder
  if (tempDir !== undefined) {
    await rimraf(tempDir);
  }
});

async function prefillCache(version = '0.8.29', soljson = require.resolve('solc-0.8.29/soljson.js')) {
  const dir = await getSolcCacheDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.copyFile(soljson, path.join(dir, `soljson-v${version}.cjs`));
}

async function getBuildInfo(contract: string) {
  const buildInfo = await artifacts.getBuildInfo(contract);
  if (buildInfo === undefined) {
    throw new Error(`Build info not found for ${contract}`);
  }
  return buildInfo;
}

async function writeBuildInfo(dir: string, buildInfo: object) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'build-info.json'), JSON.stringify(buildInfo));
}

async function validate(t: ExecutionContext, reference: string, contract: string, source = fixture) {
  const dir = t.title.replace(/\W+/g, '-');
  await writeBuildInfo(dir, await getBuildInfo(`${source}:${contract}`));
  return validateUpgradeSafety(dir, contract, reference);
}

async function exists(file: string) {
  return fs.access(file).then(
    () => true,
    () => false,
  );
}

for (const [reference, contract] of [
  ['FillSlotV1', 'FillSlotV2'],
  ['FillSlotInStructV1', 'FillSlotInStructV2'],
  ['UseGapV1', 'UseGapV2'],
  ['UseGapInStructV1', 'UseGapInStructV2'],
  ['UseGapV1', 'UseGapMultipleSlotsV2'],
  ['GapBeforeMemberV1', 'GapBeforeMemberV2'],
  ['FillSlotV1', 'FillSlotAndAppendV2'],
  ['RetypeInStructV1', 'RetypeInStructV2'],
  ['UserDefinedValueTypeV1', 'UserDefinedValueTypeV2'],
  ['UserDefinedValueTypeInStructV1', 'UserDefinedValueTypeInStructV2'],
]) {
  test.serial(`passes with a detailed storage layout - ${contract}`, async t => {
    await prefillCache();
    const report = await validate(t, reference, contract);
    t.true(report.ok, report.explain());
    t.deepEqual(fetchCalls, []);
  });
}

test.serial('passes with a detailed storage layout - namespace retype', async t => {
  await prefillCache();
  const report = await validate(
    t,
    'NamespaceRetypeV1',
    'NamespaceRetypeV2',
    'contracts/test/cli/StructMemberAnnotations.sol',
  );
  t.true(report.ok, report.explain());
});

test.serial('compiler unavailable', async t => {
  // The namespace retype is uncertain without a detailed storage layout, and the compiler cannot be downloaded
  const report = await validate(
    t,
    'NamespaceRetypeV1',
    'NamespaceRetypeV2',
    'contracts/test/cli/StructMemberAnnotations.sol',
  );
  t.false(report.ok);
  t.true(
    report.explain().includes('Layout could have changed for `x` (bytes32 -> struct TransientSlot.TBytes32)'),
    report.explain(),
  );
  t.true(report.explain().includes(NOTE), report.explain());
  t.deepEqual(fetchCalls, ['https://binaries.soliditylang.org/emscripten-wasm32/list.json']);
  t.snapshot(report.explain());
});

for (const [reference, contract, error] of [
  ['GapBeforeMemberV1', 'GapNotReducedV2', 'Slot changed from 1 to 2'],
  ['GapBeforeMemberV1', 'GapReducedTooLittleV2', 'Bad storage gap resize from 49 to 48'],
  ['GapBeforeMemberV1', 'GapReducedTooMuchV2', 'Bad storage gap resize from 49 to 47'],
  ['FillSlotV1', 'RetypeSizeChangeV2', 'Number of bytes changed from 16 to 32'],
]) {
  test.serial(`fails with a detailed storage layout - ${contract}`, async t => {
    await prefillCache();
    const report = await validate(t, reference, contract);
    t.false(report.ok);
    t.true(report.explain().includes(error), report.explain());
    t.false(report.explain().includes(NOTE), report.explain());
  });
}

test.serial('fails with a detailed storage layout - type change', async t => {
  await prefillCache();
  const report = await validate(t, 'FillSlotV1', 'TypeChangeV2');
  t.false(report.ok);
  t.true(report.explain().includes('Bad upgrade from uint128 to uint256'), report.explain());
  t.false(report.explain().includes(NOTE), report.explain());
});

test.serial('fails with a detailed storage layout - deleted namespace', async t => {
  await prefillCache();
  const report = await validate(t, 'FillSlotV1', 'DeletedNamespaceV2');
  t.false(report.ok);
  t.true(report.explain().includes('Deleted namespace `erc7201:example.main`'), report.explain());
  t.false(report.explain().includes(NOTE), report.explain());
});

test.serial('no second pass - error in regular storage', async t => {
  const report = await validate(t, 'MixedV1', 'RegularStorageErrorV2');
  t.false(report.ok);
  t.true(report.explain().includes('Upgraded `x` to an incompatible type'), report.explain());
  t.false(report.explain().includes(NOTE), report.explain());
  t.deepEqual(fetchCalls, []);
  t.false(await exists(await getSolcCacheDir()));
});

test.serial('no second pass - error that is not about storage', async t => {
  const report = await validate(t, 'MixedV1', 'NonStorageErrorV2');
  t.false(report.ok);
  t.true(report.explain().includes('Use of delegatecall is not allowed'), report.explain());
  t.false(report.explain().includes(NOTE), report.explain());
  t.deepEqual(fetchCalls, []);
  t.false(await exists(await getSolcCacheDir()));
});

test.serial('no second pass - passes without a detailed storage layout', async t => {
  const report = await validate(t, 'FillSlotV1', 'AppendV2');
  t.true(report.ok, report.explain());
  t.deepEqual(fetchCalls, []);
  t.false(await exists(await getSolcCacheDir()));
});

test.serial('corrupt cached compiler', async t => {
  // A path that no earlier test loaded the compiler from, since Node keeps loaded modules
  setSolcCacheDirForTesting(path.resolve('corrupt-solc-cache'));
  await fs.mkdir(await getSolcCacheDir(), { recursive: true });
  await fs.writeFile(path.join(await getSolcCacheDir(), 'soljson-v0.8.29.cjs'), 'not a compiler');

  const report = await validate(t, 'FillSlotV1', 'FillSlotV2');
  t.false(report.ok);
  t.true(report.explain().includes('Inserted `c`'), report.explain());
  t.true(report.explain().includes(`${NOTE}. The Solidity compiler at`), report.explain());
  t.true(report.explain().includes('could not be loaded'), report.explain());
});

test.serial('cache folder that cannot be written', async t => {
  // A folder below a file cannot be created
  await fs.writeFile('not-a-folder', '');
  setSolcCacheDirForTesting(path.resolve('not-a-folder', 'solc'));

  const report = await validate(t, 'FillSlotV1', 'FillSlotV2');
  t.false(report.ok);
  t.true(report.explain().includes('Inserted `c`'), report.explain());
  t.true(report.explain().includes(`${NOTE}. The Solidity compiler could not be saved in`), report.explain());
  t.true(report.explain().includes('can be written, then run the validation again'), report.explain());
  t.deepEqual(fetchCalls, []);
});

test.serial('cached compiler of another version', async t => {
  // The cached file for 0.8.28 is actually the 0.8.29 compiler
  await prefillCache('0.8.28');
  const buildInfo = await getBuildInfo(`${fixture}:FillSlotV2`);
  buildInfo.solcVersion = '0.8.28';
  await writeBuildInfo('cached-compiler-of-another-version', buildInfo);

  const report = await validateUpgradeSafety('cached-compiler-of-another-version', 'FillSlotV2', 'FillSlotV1');
  t.false(report.ok);
  t.true(report.explain().includes('Inserted `c`'), report.explain());
  t.true(report.explain().includes('expected solc 0.8.28, but found solc 0.8.29'), report.explain());
});

test.serial('namespaced compilation error', async t => {
  await prefillCache();
  const buildInfo = await getBuildInfo(`${fixture}:FillSlotV2`);
  // Only the namespaced compilation uses the compiler settings, so this only makes the namespaced compilation fail
  buildInfo.input.settings.evmVersion = 'invalid';
  await writeBuildInfo('namespaced-compilation-error', buildInfo);

  const report = await validateUpgradeSafety('namespaced-compilation-error', 'FillSlotV2', 'FillSlotV1');
  t.false(report.ok);
  t.true(report.explain().includes('Inserted `c`'), report.explain());
  t.true(report.explain().includes(NOTE), report.explain());
  t.true(report.explain().includes('Invalid EVM version'), report.explain());
});

test.serial('reference build info dir', async t => {
  await prefillCache();
  const buildInfo = await getBuildInfo(`${fixture}:FillSlotV2`);
  await writeBuildInfo('reference-dir/current', buildInfo);
  await writeBuildInfo('reference-dir/previous', buildInfo);

  const report = await validateUpgradeSafety('reference-dir/current', 'FillSlotV2', 'previous:FillSlotV1', {}, [
    'reference-dir/previous',
  ]);
  t.true(report.ok, report.explain());
});

test.serial('Foundry build info', async t => {
  await prefillCache();
  const { input, output, solcVersion } = await getBuildInfo(`${fixture}:FillSlotV2`);
  // Foundry adds these keys to the compiler input, but solc rejects them in standard JSON input
  const foundryInput = {
    ...input,
    allowPaths: [process.cwd()],
    basePath: process.cwd(),
    includePaths: [],
    version: solcVersion,
  };
  await writeBuildInfo('foundry-build-info', {
    _format: 'ethers-rs-sol-build-info-1',
    solcVersion,
    solcLongVersion: solcVersion,
    input: foundryInput,
    output,
  });

  const report = await validateUpgradeSafety('foundry-build-info', 'FillSlotV2', 'FillSlotV1');
  t.true(report.ok, report.explain());
});

test.serial('Hardhat 3 build info', async t => {
  await prefillCache();
  const namespace = (members: string) =>
    `/// @custom:storage-location erc7201:example.main\n  struct MainStorage { ${members} }`;
  const userSourceNameMap = { 'contracts/V1.sol': 'project/zzz/V1.sol', 'contracts/V2.sol': 'project/aaa/V2.sol' };
  // Sorted by user source name, V1 comes first, but sorted by canonical source name, V2 comes first. Solc numbers
  // sources in sorted order, so source ids only match if the namespaced compilation uses the canonical names.
  const input: SolcInput = {
    sources: {
      'project/zzz/V1.sol': {
        content: `pragma solidity ^0.8.20;\ncontract HH3V1 {\n  ${namespace('uint128 a; uint256 b;')}\n}\n`,
      },
      'project/aaa/V2.sol': {
        content: `pragma solidity ^0.8.20;\ncontract HH3V2 {\n  ${namespace('uint128 a; uint128 c; uint256 b;')}\n}\n`,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['storageLayout', 'abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers'],
          '': ['ast'],
        },
      },
    },
  };
  const output = await hardhatCompile({ language: 'Solidity', ...input } as SolcInput, '0.8.29');
  await fs.mkdir('hardhat-3-build-info', { recursive: true });
  await fs.writeFile(
    'hardhat-3-build-info/solc-0_8_29-test.json',
    JSON.stringify({
      _format: 'hh3-sol-build-info-1',
      solcVersion: '0.8.29',
      userSourceNameMap,
      input: { language: 'Solidity', ...input },
    }),
  );
  await fs.writeFile('hardhat-3-build-info/solc-0_8_29-test.output.json', JSON.stringify({ output }));

  const report = await validateUpgradeSafety('hardhat-3-build-info', 'HH3V2', 'HH3V1');
  t.true(report.ok, report.explain());
});

async function hardhatCompile(input: SolcInput, solcVersion: string): Promise<SolcOutput> {
  const solcBuild: SolcBuild = await run(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, {
    quiet: true,
    solcVersion,
  });

  const output: SolcOutput = solcBuild.isSolcJs
    ? await run(TASK_COMPILE_SOLIDITY_RUN_SOLCJS, { input, solcJsPath: solcBuild.compilerPath })
    : await run(TASK_COMPILE_SOLIDITY_RUN_SOLC, { input, solcPath: solcBuild.compilerPath });

  const errors = output.errors?.filter(e => e.severity === 'error');
  if (errors !== undefined && errors.length > 0) {
    throw new Error(errors.map(e => e.formattedMessage).join('\n'));
  }
  return output;
}
