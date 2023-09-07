const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Example = await ethers.getContractFactory('Example');
  t.context.ExampleV2_Ok = await ethers.getContractFactory('ExampleV2_Ok');
  t.context.ExampleV2_Bad = await ethers.getContractFactory('ExampleV2_Bad');
  t.context.RecursiveStruct = await ethers.getContractFactory('RecursiveStruct');
  t.context.RecursiveStructV2_Ok = await ethers.getContractFactory('RecursiveStructV2_Ok');
  t.context.RecursiveStructV2_Bad = await ethers.getContractFactory('RecursiveStructV2_Bad');
  t.context.TripleStruct = await ethers.getContractFactory('TripleStruct');
  t.context.TripleStructV2_Ok = await ethers.getContractFactory('TripleStructV2_Ok');
  t.context.TripleStructV2_Bad = await ethers.getContractFactory('TripleStructV2_Bad');
});

test('validate namespace - ok', async t => {
  const { Example, ExampleV2_Ok } = t.context;

  await upgrades.validateUpgrade(Example, ExampleV2_Ok);
});

test('validate namespace - bad', async t => {
  const { Example, ExampleV2_Bad } = t.context;

  try {
    await upgrades.validateUpgrade(Example, ExampleV2_Bad);
  } catch (e) {
    const comparison = e.report.ops;

    // Ensure the layout change is detected, in addition to the deletion. This is not normally reported since it has lower cost.
    t.like(comparison, {
      length: 2,
      0: {
        kind: 'delete',
        original: {
          contract: 'Example',
          label: 'x',
          type: {
            id: 't_uint256',
          },
        },
      },
      1: {
        kind: 'layoutchange',
        original: {
          label: 'y',
          type: {
            id: 't_uint256',
          },
          slot: '1',
        },
        updated: {
          label: 'y',
          type: {
            id: 't_uint256',
          },
          slot: '0',
        },
      },
    });

    t.snapshot(e.message);
  }
});

test('validate namespace - recursive - ok', async t => {
  const { RecursiveStruct, RecursiveStructV2_Ok } = t.context;

  await upgrades.validateUpgrade(RecursiveStruct, RecursiveStructV2_Ok);
});

test('validate namespace - recursive - bad', async t => {
  const { RecursiveStruct, RecursiveStructV2_Bad } = t.context;

  try {
    await upgrades.validateUpgrade(RecursiveStruct, RecursiveStructV2_Bad);
  } catch (e) {
    const comparison = e.report.ops;

    t.like(comparison, {
      length: 2,
      0: {
        kind: 'typechange',
        change: {
          kind: 'struct members',
          ops: {
            length: 1,
            0: { kind: 'append' },
          },
        },
        original: { label: 's' },
        updated: { label: 's' },
      },
      1: {
        kind: 'layoutchange',
        original: {
          label: 'y',
          slot: '2',
        },
        updated: {
          label: 'y',
          slot: '3',
        },
      },
    });

    t.snapshot(e.message);
  }
});

test('validate namespace - triple struct - ok', async t => {
  const { TripleStruct, TripleStructV2_Ok } = t.context;

  await upgrades.validateUpgrade(TripleStruct, TripleStructV2_Ok);
});

test('validate namespace - triple struct - bad', async t => {
  const { TripleStruct, TripleStructV2_Bad } = t.context;

  try {
    await upgrades.validateUpgrade(TripleStruct, TripleStructV2_Bad);
  } catch (e) {
    const comparison = e.report.ops;

    t.like(comparison, {
      length: 2,
      0: {
        kind: 'typechange',
        change: {
          kind: 'struct members',
          ops: {
            length: 1,
            0: {
              kind: 'typechange',
              change: {
                kind: 'struct members',
                ops: {
                  length: 1,
                  0: { kind: 'append' },
                },
              },
            },
          },
        },
      },
      1: {
        kind: 'layoutchange',
        original: {
          label: 'y',
          slot: '2',
        },
        updated: {
          label: 'y',
          slot: '3',
        },
      },
    });

    t.snapshot(e.message);
  }
});
