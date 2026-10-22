import _test, { TestFn } from 'ava';
import { artifacts } from 'hardhat';
import { BuildInfo } from 'hardhat/types';
import { findAll } from 'solidity-ast/utils';

import { SolcInput, SolcOutput } from './solc-api';
import { validate, ValidationRunData } from './validate';
import { withValidationDefaults } from './validate/overrides';
import { solcInputOutputDecoder } from './src-decoder';
import { getStorageUpgradeErrors, getStorageUpgradeReport } from './storage';
import { StorageLayout, isStructMembers } from './storage/layout';
import { stabilizeStorageLayout } from './utils/stabilize-layout';

const source = 'contracts/test/StructMemberRenamedRetyped.sol';

interface Context {
  buildInfo: BuildInfo;
  validate: (solcInput?: SolcInput, solcOutput?: SolcOutput) => ValidationRunData;
  layout: (contract: string) => StorageLayout;
}

const test = _test as TestFn<Context>;

test.before(async t => {
  const buildInfo = await artifacts.getBuildInfo(`${source}:StructMemberRenamedRetypedV1`);
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }
  t.context.buildInfo = buildInfo;
  // The source decoder always uses the original build info, since the tests below only modify the input in ways
  // that keep line numbers unchanged.
  const decodeSrc = solcInputOutputDecoder(buildInfo.input, buildInfo.output);
  t.context.validate = (solcInput = buildInfo.input, solcOutput = buildInfo.output) =>
    validate(solcOutput, decodeSrc, buildInfo.solcVersion, solcInput);
  const validation = t.context.validate();
  t.context.layout = contract => validation[`${source}:${contract}`].layout;
});

function getStructMembers(layout: StorageLayout, label: string) {
  const members = Object.values(layout.types).find(type => type.label === label)?.members;
  if (members === undefined || !isStructMembers(members)) {
    throw new Error(`Struct members not found for ${label}`);
  }
  return members;
}

/**
 * Replaces the given comment inside a struct body with code of the same length, so that the AST offsets still line up
 * but the text between two members is not whitespace or comments, as it would be with syntax that is not supported.
 */
function withUnexpectedStructSyntax(solcInput: SolcInput, comment: string): SolcInput {
  const content = solcInput.sources[source].content;
  if (content === undefined || !content.includes(comment)) {
    throw new Error(`Comment ${comment} not found in ${source}`);
  }
  const code = 'uint256 q;'.padEnd(comment.length);
  return { ...solcInput, sources: { ...solcInput.sources, [source]: { content: content.replace(comment, code) } } };
}

test('layout', t => {
  t.snapshot(stabilizeStorageLayout(t.context.layout('StructMemberRenamedRetypedV2')));
});

test('upgrade ok', t => {
  const v1 = t.context.layout('StructMemberRenamedRetypedV1');
  const v2 = t.context.layout('StructMemberRenamedRetypedV2');
  t.deepEqual(getStorageUpgradeErrors(v1, v2), []);
});

test('exact map', t => {
  const members = getStructMembers(t.context.layout('StructMemberExactMap'), 'struct StructMemberExactMap.S');
  t.is(members.length, 5);
  for (const member of members) {
    t.is(member.renamedFrom, `old_${member.label}`);
    t.is(member.retypedFrom, undefined);
  }
});

test('wrong retype', t => {
  const v1 = t.context.layout('StructMemberBadV1');
  const v2 = t.context.layout('StructMemberWrongRetypeV2');
  t.like(getStorageUpgradeErrors(v1, v2), {
    length: 1,
    0: {
      kind: 'typechange',
      change: {
        kind: 'struct members',
        ops: {
          length: 1,
          0: { kind: 'typechange', original: { label: 'x' }, updated: { label: 'x', retypedFrom: 'address' } },
        },
      },
      original: { label: 's' },
      updated: { label: 's' },
    },
  });
});

test('retype with layout change', t => {
  // A retype annotation that names the original type does not allow the member's size to change
  const v1 = t.context.layout('StructMemberRetypeLayoutChangeV1');
  const v2 = t.context.layout('StructMemberRetypeLayoutChangeV2');
  t.like(getStorageUpgradeErrors(v1, v2), {
    length: 1,
    0: {
      kind: 'typechange',
      change: {
        kind: 'struct members',
        ops: {
          length: 1,
          0: {
            kind: 'layoutchange',
            original: { label: 'y' },
            updated: { label: 'y', retypedFrom: 'uint256' },
            change: { bytes: { from: '32', to: '16' } },
          },
        },
      },
      original: { label: 's' },
      updated: { label: 's' },
    },
  });
});

test('annotation on the wrong member', t => {
  // The annotation makes `x` match the original `y` with a different type, and `x` and `z` are left unmatched
  const v1 = t.context.layout('StructMemberBadV1');
  const v2 = t.context.layout('StructMemberWrongMemberV2');
  t.like(getStorageUpgradeErrors(v1, v2), {
    length: 1,
    0: {
      kind: 'typechange',
      change: {
        kind: 'struct members',
        ops: {
          length: 3,
          0: { kind: 'delete', original: { label: 'x' } },
          1: { kind: 'typechange', original: { label: 'y' }, updated: { label: 'x', renamedFrom: 'y' } },
          2: { kind: 'insert', updated: { label: 'z' } },
        },
      },
      original: { label: 's' },
      updated: { label: 's' },
    },
  });
});

test('stale rename annotation', t => {
  const v1 = t.context.layout('StructMemberBadV1');
  const v2 = t.context.layout('StructMemberStaleRenameV2');
  t.like(getStorageUpgradeErrors(v1, v2), {
    length: 1,
    0: {
      kind: 'typechange',
      change: {
        kind: 'struct members',
        ops: {
          length: 1,
          0: { kind: 'rename', original: { label: 'y' }, updated: { label: 'y', renamedFrom: 'q' } },
        },
      },
      original: { label: 's' },
      updated: { label: 's' },
    },
  });
});

test('unannotated rename and retype', t => {
  const v1 = t.context.layout('StructMemberBadV1');
  const v2 = t.context.layout('StructMemberUnannotatedV2');
  t.like(getStorageUpgradeErrors(v1, v2), {
    length: 1,
    0: {
      kind: 'typechange',
      change: {
        kind: 'struct members',
        ops: {
          length: 2,
          0: { kind: 'typechange', original: { label: 'x' }, updated: { label: 'x' } },
          1: { kind: 'rename', original: { label: 'y' }, updated: { label: 'z' } },
        },
      },
      original: { label: 's' },
      updated: { label: 's' },
    },
  });
});

test('annotated members without layout info', t => {
  // Without the compiler's storage layout, members have no slots. A retype that is not known to be compatible is then uncertain.
  const solcOutput: SolcOutput = JSON.parse(JSON.stringify(t.context.buildInfo.output));
  for (const contracts of Object.values(solcOutput.contracts)) {
    for (const contract of Object.values(contracts)) {
      delete contract.storageLayout;
    }
  }
  const validation = t.context.validate(undefined, solcOutput);
  const v1 = validation[`${source}:StructMemberRenamedRetypedV1`].layout;
  const v2 = validation[`${source}:StructMemberRenamedRetypedV2`].layout;
  const report = getStorageUpgradeReport(v1, v2, withValidationDefaults({}));
  t.false(report.ok);
  t.like(report.ops, {
    length: 4,
    0: { kind: 'typechange', original: { label: 's' } },
    1: { kind: 'typechange', original: { label: 'm' } },
    2: { kind: 'typechange', original: { label: 'arr' } },
    3: { kind: 'typechange', original: { label: 'other' } },
  });
  t.true(
    report.explain().includes('Layout could have changed for `x` (bytes32 -> struct TransientSlot.TBytes32)'),
    report.explain(),
  );
  t.snapshot(report.explain());
});

test('annotations are not read without source content', t => {
  const { input } = t.context.buildInfo;
  const sources = Object.fromEntries(Object.keys(input.sources).map(path => [path, {}]));
  const validation = t.context.validate({ ...input, sources });
  const v1 = validation[`${source}:StructMemberRenamedRetypedV1`].layout;
  const v2 = validation[`${source}:StructMemberRenamedRetypedV2`].layout;
  t.like(getStorageUpgradeErrors(v1, v2), {
    length: 5,
    0: { kind: 'typechange', original: { label: 's' } },
    1: { kind: 'typechange', original: { label: 'm' } },
    2: { kind: 'typechange', original: { label: 'arr' } },
    3: { kind: 'typechange', original: { label: 'outer' } },
    4: { kind: 'typechange', original: { label: 'other' } },
  });
});

test('unexpected syntax in struct with annotations', t => {
  const { input, output } = t.context.buildInfo;
  const structDef = [...findAll('StructDefinition', output.sources[source].ast)].find(
    s => s.canonicalName === 'StructMemberUnreadableAnnotated.S',
  );
  if (structDef === undefined) {
    throw new Error('Struct not found');
  }
  const structSrc = solcInputOutputDecoder(input, output)(structDef);

  const error = t.throws(() => t.context.validate(withUnexpectedStructSyntax(input, '// 12345678')));
  t.true(
    error?.message.includes(
      `${structSrc}: Could not read storage annotations on members of struct \`StructMemberUnreadableAnnotated.S\``,
    ),
    error?.message,
  );
  t.true(
    error?.message.includes(
      'Please report this at https://zpl.in/upgrades/report and include the struct definition from your contract.',
    ),
    error?.message,
  );
});

test('unexpected syntax in struct without annotations', t => {
  const validation = t.context.validate(withUnexpectedStructSyntax(t.context.buildInfo.input, '// 87654321'));
  const layout = validation[`${source}:StructMemberUnreadableUnannotated`].layout;
  t.like(getStructMembers(layout, 'struct StructMemberUnreadableUnannotated.S'), {
    length: 2,
    0: { label: 'b', renamedFrom: undefined, retypedFrom: undefined },
    1: { label: 'c', renamedFrom: undefined, retypedFrom: undefined },
  });
  // Other structs are unaffected
  const v1 = validation[`${source}:StructMemberRenamedRetypedV1`].layout;
  const v2 = validation[`${source}:StructMemberRenamedRetypedV2`].layout;
  t.deepEqual(getStorageUpgradeErrors(v1, v2), []);
});

test('unexpected syntax in struct with other annotations', t => {
  const validation = t.context.validate(withUnexpectedStructSyntax(t.context.buildInfo.input, '// 13572468'));
  const layout = validation[`${source}:StructMemberUnreadableOtherAnnotation`].layout;
  t.like(getStructMembers(layout, 'struct StructMemberUnreadableOtherAnnotation.S'), {
    length: 2,
    0: { label: 'b', renamedFrom: undefined, retypedFrom: undefined },
    1: { label: 'c', renamedFrom: undefined, retypedFrom: undefined },
  });
});

test('multiple annotations in a doc block without line prefixes', t => {
  const layout = t.context.layout('StateVariableDocBlock');
  t.like(layout.storage, { length: 1, 0: { label: 'x', renamedFrom: 'a', retypedFrom: 'uint8' } });
});
