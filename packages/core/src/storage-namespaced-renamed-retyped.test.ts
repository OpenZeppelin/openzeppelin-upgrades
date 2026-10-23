import _test, { ExecutionContext, TestFn } from 'ava';
import { artifacts, run } from 'hardhat';
import {
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
  TASK_COMPILE_SOLIDITY_RUN_SOLC,
  TASK_COMPILE_SOLIDITY_RUN_SOLCJS,
} from 'hardhat/builtin-tasks/task-names';
import { SolcBuild } from 'hardhat/types/builtin-tasks';

import { SolcInput, SolcOutput } from './solc-api';
import { validate, ValidationRunData } from './validate';
import { withValidationDefaults } from './validate/overrides';
import { solcInputOutputDecoder } from './src-decoder';
import { makeNamespacedInput, trySanitizeNatSpec } from './utils/make-namespaced';
import { getStorageUpgradeErrors, getStorageUpgradeReport } from './storage';
import { StorageLayout, isStructMembers } from './storage/layout';
import { stabilizeStorageLayout } from './utils/stabilize-layout';

const source = 'contracts/test/NamespacedRenamedRetyped.sol';
const crossFileSource = 'contracts/test/NamespacedCrossFile.sol';

interface Context {
  input: SolcInput;
  output: SolcOutput;
  namespacedOutput: SolcOutput;
  solcVersion: string;
  validation: ValidationRunData;
  // Validation without the namespaced compilation, as with the build info files of the CLI, so that namespace members
  // have no slots
  validationWithoutSlots: ValidationRunData;
  // Validation of the fixture whose namespace has a member of a struct type from another source file
  crossFile: { output: SolcOutput; validation: ValidationRunData };
}

const test = _test as TestFn<Context>;

test.before(async t => {
  const { input, output, solcVersion } = await getBuildInfo(`${source}:NamespacedRenamedRetypedV1`);
  const namespacedOutput = await compileNamespaced(input, output, solcVersion);
  const decodeSrc = solcInputOutputDecoder(input, output);
  t.context.input = input;
  t.context.output = output;
  t.context.namespacedOutput = namespacedOutput;
  t.context.solcVersion = solcVersion;
  t.context.validation = validate(output, decodeSrc, solcVersion, input, namespacedOutput);
  t.context.validationWithoutSlots = validate(output, decodeSrc, solcVersion, input);

  const crossFile = await getBuildInfo(`${crossFileSource}:NamespacedCrossFileV1`);
  t.context.crossFile = {
    output: crossFile.output,
    validation: await validateWithNamespacedOutput(crossFile.input, crossFile.output, crossFile.solcVersion),
  };
});

async function getBuildInfo(contract: string) {
  const buildInfo = await artifacts.getBuildInfo(contract);
  if (buildInfo === undefined) {
    throw new Error(`Build info not found for ${contract}`);
  }
  return buildInfo;
}

/**
 * Compiles the namespaced input for the given compilation, following the same steps as the Hardhat plugin.
 */
async function compileNamespaced(input: SolcInput, output: SolcOutput, solcVersion: string) {
  const namespacedInput = await trySanitizeNatSpec(makeNamespacedInput(input, output, solcVersion), solcVersion);
  return hardhatCompile(namespacedInput, solcVersion);
}

/**
 * Validates with a namespaced compilation.
 */
async function validateWithNamespacedOutput(input: SolcInput, output: SolcOutput, solcVersion: string) {
  const namespacedOutput = await compileNamespaced(input, output, solcVersion);
  return validate(output, solcInputOutputDecoder(input, output), solcVersion, input, namespacedOutput);
}

/**
 * Compiles the fixture again from the given source content and validates with a namespaced compilation.
 */
async function compileAndValidate(input: SolcInput, content: string, solcVersion: string) {
  const newInput = { ...input, sources: { [source]: { content } } };
  const output = await hardhatCompile(newInput, solcVersion);
  return validateWithNamespacedOutput(newInput, output, solcVersion);
}

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

function getLayout(validation: ValidationRunData, contract: string): StorageLayout {
  return validation[`${source}:${contract}`].layout;
}

function assertAnnotationsApplied(t: ExecutionContext<Context>, validation: ValidationRunData) {
  const v1 = getLayout(validation, 'NamespacedRenamedRetypedV1');
  const v2 = getLayout(validation, 'NamespacedRenamedRetypedV2');
  t.deepEqual(getStorageUpgradeErrors(v1, v2), []);
  assertExactMap(t, getLayout(validation, 'NamespacedExactMap'));
}

function assertExactMap(t: ExecutionContext<Context>, layout: StorageLayout) {
  const items = layout.namespaces?.['erc7201:example.exact'];
  if (items === undefined) {
    throw new Error('Namespace not found');
  }
  t.is(items.length, 6);
  for (const item of items) {
    t.is(item.renamedFrom, `old_${item.label}`);
    t.is(item.retypedFrom, undefined);
    // Slots come from the namespaced compilation
    t.not(item.slot, undefined);
  }

  // The struct used inside the namespace is looked up through the namespaced compilation
  const members = Object.values(layout.types).find(type => type.label === 'struct NamespacedExactMap.Inner')?.members;
  if (members === undefined || !isStructMembers(members)) {
    throw new Error('Struct members not found');
  }
  t.is(members.length, 3);
  for (const member of members) {
    t.is(member.renamedFrom, `old_${member.label}`);
    t.is(member.retypedFrom, undefined);
    t.not(member.slot, undefined);
  }
}

test('layout', t => {
  t.snapshot(stabilizeStorageLayout(getLayout(t.context.validation, 'NamespacedRenamedRetypedV2')));
});

test('upgrade ok', t => {
  assertAnnotationsApplied(t, t.context.validation);
});

test('inherited namespace upgrade ok', t => {
  const v1 = getLayout(t.context.validation, 'NamespacedRenamedRetypedInheritedV1');
  const v2 = getLayout(t.context.validation, 'NamespacedRenamedRetypedInheritedV2');
  t.deepEqual(getStorageUpgradeErrors(v1, v2), []);
});

test('wrong retype', t => {
  const v1 = getLayout(t.context.validation, 'NamespacedBadV1');
  const v2 = getLayout(t.context.validation, 'NamespacedWrongRetypeV2');
  t.like(getStorageUpgradeErrors(v1, v2), {
    length: 1,
    0: { kind: 'typechange', original: { label: 'x' }, updated: { label: 'x', retypedFrom: 'address' } },
  });
});

test('annotation on the wrong member', t => {
  // The annotation makes `x` match the original `y` with a different type, and `x` and `z` are left unmatched
  const v1 = getLayout(t.context.validation, 'NamespacedBadV1');
  const v2 = getLayout(t.context.validation, 'NamespacedWrongMemberV2');
  t.like(getStorageUpgradeErrors(v1, v2), {
    length: 3,
    0: { kind: 'delete', original: { label: 'x' } },
    1: { kind: 'typechange', original: { label: 'y' }, updated: { label: 'x', renamedFrom: 'y' } },
    2: { kind: 'insert', updated: { label: 'z' } },
  });
});

test('stale rename annotation', t => {
  const v1 = getLayout(t.context.validation, 'NamespacedBadV1');
  const v2 = getLayout(t.context.validation, 'NamespacedStaleRenameV2');
  t.like(getStorageUpgradeErrors(v1, v2), {
    length: 1,
    0: { kind: 'rename', original: { label: 'y' }, updated: { label: 'y', renamedFrom: 'q' } },
  });
});

test('unannotated rename and retype', t => {
  const v1 = getLayout(t.context.validation, 'NamespacedBadV1');
  const v2 = getLayout(t.context.validation, 'NamespacedUnannotatedV2');
  t.like(getStorageUpgradeErrors(v1, v2), {
    length: 2,
    0: { kind: 'typechange', original: { label: 'x' }, updated: { label: 'x' } },
    1: { kind: 'rename', original: { label: 'y' }, updated: { label: 'z' } },
  });
});

test('namespaced output with different source ids', t => {
  const { input, output, namespacedOutput, solcVersion } = t.context;
  const sources = Object.fromEntries(
    Object.entries(namespacedOutput.sources).map(([path, s]) => [path, { ...s, id: s.id + 1 }]),
  );
  t.throws(
    () => validate(output, solcInputOutputDecoder(input, output), solcVersion, input, { ...namespacedOutput, sources }),
    { message: /Source ids differ between the solc output and the namespaced solc output/ },
  );
});

test('two annotated namespaces in one contract', t => {
  const v1 = getLayout(t.context.validation, 'NamespacedTwoV1');
  const v2 = getLayout(t.context.validation, 'NamespacedTwoV2');
  t.like(v2.namespaces, {
    'erc7201:example.first': {
      length: 2,
      0: { label: 'x', retypedFrom: 'bytes32' },
      1: { label: 'y', renamedFrom: 'oldY' },
    },
    'erc7201:example.second': {
      length: 2,
      0: { label: 'f', retypedFrom: 'uint8' },
      1: { label: 'g', renamedFrom: 'oldG' },
    },
  });
  t.deepEqual(getStorageUpgradeErrors(v1, v2), []);
});

test('kept retype annotation', t => {
  const v1 = getLayout(t.context.validation, 'NamespacedKeptRetypeV1');
  const v2 = getLayout(t.context.validation, 'NamespacedKeptRetypeV2');
  t.like(v2.namespaces, { 'erc7201:example.main': { length: 1, 0: { label: 'x', retypedFrom: 'uint8', slot: '0' } } });
  t.deepEqual(getStorageUpgradeErrors(v1, v2), []);
});

test('kept retype annotation without layout info', t => {
  const v1 = getLayout(t.context.validationWithoutSlots, 'NamespacedKeptRetypeV1');
  const v2 = getLayout(t.context.validationWithoutSlots, 'NamespacedKeptRetypeV2');
  t.like(v2.namespaces, {
    'erc7201:example.main': { length: 1, 0: { label: 'x', retypedFrom: 'uint8', slot: undefined } },
  });
  t.deepEqual(getStorageUpgradeErrors(v1, v2), []);
});

test('retype without layout info', t => {
  // A retype that is not known to be compatible is uncertain without slots
  const v1 = getLayout(t.context.validationWithoutSlots, 'NamespacedBadV1');
  const v2 = getLayout(t.context.validationWithoutSlots, 'NamespacedRetypeV2');
  const report = getStorageUpgradeReport(v1, v2, withValidationDefaults({}));
  t.false(report.ok);
  t.true(
    report.explain().includes('Layout could have changed for `x` (bytes32 -> struct TransientSlot.TBytes32)'),
    report.explain(),
  );
});

test('wrong retype without layout info', t => {
  const v1 = getLayout(t.context.validationWithoutSlots, 'NamespacedBadV1');
  const v2 = getLayout(t.context.validationWithoutSlots, 'NamespacedWrongRetypeV2');
  t.like(getStorageUpgradeErrors(v1, v2), {
    length: 1,
    0: { kind: 'typechange', original: { label: 'x' }, updated: { label: 'x', retypedFrom: 'address' } },
  });
});

test('retype with layout change', t => {
  // A retype annotation that names the original type does not allow the member's size to change
  const v1 = getLayout(t.context.validation, 'NamespacedRetypeLayoutChangeV1');
  const v2 = getLayout(t.context.validation, 'NamespacedRetypeLayoutChangeV2');
  t.like(getStorageUpgradeErrors(v1, v2), {
    length: 1,
    0: {
      kind: 'layoutchange',
      original: { label: 'y' },
      updated: { label: 'y', retypedFrom: 'uint256' },
      change: { bytes: { from: '32', to: '16' } },
    },
  });
});

test('struct from another source file', t => {
  // The annotations on the members of the struct are read from the source file that defines it
  const { output, validation } = t.context.crossFile;
  t.not(output.sources['contracts/test/NamespacedCrossFileStruct.sol'].id, 0);
  const v1 = validation[`${crossFileSource}:NamespacedCrossFileV1`].layout;
  const v2 = validation[`${crossFileSource}:NamespacedCrossFileV2`].layout;
  t.like(v2.namespaces, { 'erc7201:example.main': { length: 1, 0: { label: 'data', slot: '0' } } });
  const members = Object.values(v2.types).find(type => type.label === 'struct CrossFileV2.Data')?.members;
  if (members === undefined || !isStructMembers(members)) {
    throw new Error('Struct members not found');
  }
  t.like(members, {
    length: 2,
    0: { label: 'a', retypedFrom: 'bytes32', slot: '0' },
    1: { label: 'c', renamedFrom: 'b', slot: '1' },
  });
  t.deepEqual(getStorageUpgradeErrors(v1, v2), []);
});

/**
 * Validates the fixture compiled again with the given line endings.
 */
async function validateWithLineEndings(t: ExecutionContext<Context>, lineEnding: string) {
  const content = t.context.input.sources[source].content;
  if (content === undefined) {
    throw new Error('Unexpected fixture content');
  }
  return compileAndValidate(t.context.input, content.replace(/\r\n|\r|\n/g, lineEnding), t.context.solcVersion);
}

test('CRLF line endings', async t => {
  assertAnnotationsApplied(t, await validateWithLineEndings(t, '\r\n'));
});

test('CR line endings', async t => {
  assertAnnotationsApplied(t, await validateWithLineEndings(t, '\r'));
});

test('solc 0.8.20', async t => {
  const content = t.context.input.sources[source].content;
  if (content === undefined) {
    throw new Error('Unexpected fixture content');
  }
  const validation = await compileAndValidate(t.context.input, content, '0.8.20');
  assertAnnotationsApplied(t, validation);
});

test('stale rename annotation report', t => {
  const v1 = getLayout(t.context.validation, 'NamespacedBadV1');
  const v2 = getLayout(t.context.validation, 'NamespacedStaleRenameV2');
  const report = getStorageUpgradeReport(v1, v2, withValidationDefaults({}));
  t.false(report.ok);
  const items = v2.namespaces?.['erc7201:example.main'];
  if (items === undefined) {
    throw new Error('Namespace not found');
  }
  t.is(
    report.explain(),
    `${items[1].src}: \`y\` has a '@custom:oz-renamed-from q' annotation, but it was not renamed\n` +
      '  > If the annotation is left over from an earlier upgrade, remove it.',
  );
});
