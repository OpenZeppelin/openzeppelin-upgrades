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
import { version as SOLC_VERSION } from 'solc-for-namespaced-cli-tests/package.json';

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
  // Network access fails, so tests put the pinned compiler in the cache
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

async function prefillCache(
  version = SOLC_VERSION,
  soljson = require.resolve('solc-for-namespaced-cli-tests/soljson.js'),
) {
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
  const report = await validate(t, 'NamespaceRetypeV1', 'NamespaceRetypeV2');
  t.true(report.ok, report.explain());
});

/**
 * Renumbers the sources of a build info as a compiler that does not number them like solc would. For example, Solar
 * numbers sources by import order and solc numbers them by name. The source locations in the ASTs follow the new ids.
 */
function renumberSources<T extends { output: SolcOutput }>(buildInfo: T, newId: (id: number) => number): T {
  const renumbered = JSON.parse(JSON.stringify(buildInfo));
  for (const source of Object.values(renumbered.output.sources) as { id: number }[]) {
    source.id = newId(source.id);
  }
  const renumber = (location: string) =>
    location.replace(/:(\d+)$/, (_: string, id: string) => `:${newId(Number(id))}`);
  return JSON.parse(JSON.stringify(renumbered), (key, value) => {
    if (key !== 'src' && key !== 'nativeSrc' && !/Locations?$/.test(key)) {
      return value;
    }
    return typeof value === 'string' ? renumber(value) : Array.isArray(value) ? value.map(renumber) : value;
  });
}

async function validateShifted(t: ExecutionContext, reference: string, contract: string) {
  const dir = t.title.replace(/\W+/g, '-');
  // Every source gets the next id, as Solar does when an imported file takes id 0
  const buildInfo = renumberSources(await getBuildInfo(`${fixture}:${contract}`), id => id + 1);
  await writeBuildInfo(dir, buildInfo);
  return validateUpgradeSafety(dir, contract, reference);
}

test.serial('passes with a detailed storage layout - source ids not numbered by solc', async t => {
  await prefillCache();
  // The member annotation is read from the original source through the source id in the namespaced output
  const report = await validateShifted(t, 'RetypeInStructV1', 'RetypeInStructV2');
  t.true(report.ok, report.explain());
  t.deepEqual(fetchCalls, []);
});

test.serial('fails with a detailed storage layout - source ids not numbered by solc', async t => {
  await prefillCache();
  const report = await validateShifted(t, 'GapBeforeMemberV1', 'GapNotReducedV2');
  t.false(report.ok);
  t.true(report.explain().includes('Slot changed from 1 to 2'), report.explain());
  t.true(report.explain().includes('contracts/test/cli/NamespacedSlots.sol:'), report.explain());
  t.false(report.explain().includes(NOTE), report.explain());
});

test.serial('fails with a detailed storage layout - swapped source ids', async t => {
  await prefillCache();
  // Both sources define structs with the same names, but only B.sol has the rename annotation. If a struct of A.sol
  // from the namespaced compilation were mapped to the struct of B.sol, the unsafe rename in A.sol would pass.
  const structs = (renameAnnotation: string) =>
    `struct Item { uint256 a; uint256 b; }\nstruct ItemV2 { uint256 a; ${renameAnnotation}uint256 c; }\n`;
  const store = (member: string) =>
    `contract Store {\n  /// @custom:storage-location erc7201:example.main\n  struct Main { ${member} }\n}\n`;
  const input = {
    language: 'Solidity',
    sources: {
      'contracts/A.sol': {
        content: `pragma solidity ^0.8.20;\nimport "./B.sol" as B;\n${structs('')}${store('ItemV2 item;')}`,
      },
      'contracts/B.sol': {
        content: `pragma solidity ^0.8.20;\n${structs('/// @custom:oz-renamed-from b\n')}${store('Item item;')}`,
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
  const output = await hardhatCompile(input, SOLC_VERSION);
  // solc numbers the sources by name, and Solar numbers the imported B.sol first, so the ids are swapped
  const buildInfo = renumberSources({ input, output, solcVersion: SOLC_VERSION }, id => (id === 0 ? 1 : 0));
  await writeBuildInfo('swapped-source-ids', buildInfo);

  const report = await validateUpgradeSafety('swapped-source-ids', 'contracts/A.sol:Store', 'contracts/B.sol:Store');
  t.false(report.ok);
  t.true(report.explain().includes('Renamed `b` to `c`'), report.explain());
  t.false(report.explain().includes(NOTE), report.explain());
});

test.serial('compiler unavailable', async t => {
  // The namespace retype is uncertain without a detailed storage layout, and the compiler cannot be downloaded
  const report = await validate(t, 'NamespaceRetypeV1', 'NamespaceRetypeV2');
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
  await fs.writeFile(path.join(await getSolcCacheDir(), `soljson-v${SOLC_VERSION}.cjs`), 'not a compiler');

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
  // The cached file for 0.8.28 is actually the pinned compiler
  await prefillCache('0.8.28');
  const buildInfo = await getBuildInfo(`${fixture}:FillSlotV2`);
  buildInfo.solcVersion = '0.8.28';
  await writeBuildInfo('cached-compiler-of-another-version', buildInfo);

  const report = await validateUpgradeSafety('cached-compiler-of-another-version', 'FillSlotV2', 'FillSlotV1');
  t.false(report.ok);
  t.true(report.explain().includes('Inserted `c`'), report.explain());
  t.true(report.explain().includes(`expected solc 0.8.28, but found solc ${SOLC_VERSION}`), report.explain());
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

  const passing = await validateUpgradeSafety('reference-dir/current', 'FillSlotV2', 'previous:FillSlotV1', {}, [
    'reference-dir/previous',
  ]);
  t.true(passing.ok, passing.explain());

  const failing = await validateUpgradeSafety('reference-dir/current', 'TypeChangeV2', 'previous:FillSlotV1', {}, [
    'reference-dir/previous',
  ]);
  t.false(failing.ok);
  t.true(failing.explain().includes('Bad upgrade from uint128 to uint256'), failing.explain());
  t.false(failing.explain().includes(NOTE), failing.explain());
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

  const passing = await validateUpgradeSafety('foundry-build-info', 'FillSlotV2', 'FillSlotV1');
  t.true(passing.ok, passing.explain());

  const failing = await validateUpgradeSafety('foundry-build-info', 'TypeChangeV2', 'FillSlotV1');
  t.false(failing.ok);
  t.true(failing.explain().includes('Bad upgrade from uint128 to uint256'), failing.explain());
  t.false(failing.explain().includes(NOTE), failing.explain());
});

test.serial('Hardhat 3 build info', async t => {
  // Core's tests use Hardhat 2, so this writes a Hardhat 3 build info by hand
  await prefillCache();
  const namespace = (members: string) =>
    `/// @custom:storage-location erc7201:example.main\n  struct MainStorage { ${members} }`;
  const userSourceNameMap = {
    'contracts/V1.sol': 'project/zzz/V1.sol',
    'contracts/V2.sol': 'project/aaa/V2.sol',
    'contracts/V3.sol': 'project/mmm/V3.sol',
  };
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
      'project/mmm/V3.sol': {
        content: `pragma solidity ^0.8.20;\ncontract HH3V3 {\n  ${namespace('uint256 a; uint256 b;')}\n}\n`,
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
  const output = await hardhatCompile({ language: 'Solidity', ...input } as SolcInput, SOLC_VERSION);
  await fs.mkdir('hardhat-3-build-info', { recursive: true });
  await fs.writeFile(
    'hardhat-3-build-info/test.json',
    JSON.stringify({
      _format: 'hh3-sol-build-info-1',
      solcVersion: SOLC_VERSION,
      userSourceNameMap,
      input: { language: 'Solidity', ...input },
    }),
  );
  await fs.writeFile('hardhat-3-build-info/test.output.json', JSON.stringify({ output }));

  const passing = await validateUpgradeSafety('hardhat-3-build-info', 'HH3V2', 'HH3V1');
  t.true(passing.ok, passing.explain());

  const failing = await validateUpgradeSafety('hardhat-3-build-info', 'HH3V3', 'HH3V1');
  t.false(failing.ok);
  t.true(failing.explain().includes('Bad upgrade from uint128 to uint256'), failing.explain());
  t.false(failing.explain().includes(NOTE), failing.explain());
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
