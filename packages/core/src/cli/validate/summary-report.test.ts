import { getSummaryReport } from './summary-report';
import { UpgradeableContractErrorReport } from '../../validate';

import _test, { TestFn } from 'ava';
import { ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { artifacts } from 'hardhat';
import sinon from 'sinon';

import { SolcOutput } from '../../solc-api';
import { astDereferencer } from '../../ast-dereferencer';
import { extractStorageLayout } from '../../storage/extract';
import { StorageLayoutComparator } from '../../storage/compare';
import { StorageLayout, getDetailedLayout } from '../../storage/layout';
import { UpgradeableContractReport } from './contract-report';

interface Context {
  extractStorageLayout: (contract: string) => ReturnType<typeof extractStorageLayout>;
}

const test = _test as TestFn<Context>;

const dummyDecodeSrc = () => 'file.sol:1';

test.before(async t => {
  const buildInfo = await artifacts.getBuildInfo('contracts/test/Storage.sol:Storage1');
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }
  const solcOutput: SolcOutput = buildInfo.output;
  const contracts: Record<string, ContractDefinition> = {};
  for (const def of findAll('ContractDefinition', solcOutput.sources['contracts/test/Storage.sol'].ast)) {
    contracts[def.name] = def;
  }
  const deref = astDereferencer(solcOutput);
  t.context.extractStorageLayout = name => extractStorageLayout(contracts[name], dummyDecodeSrc, deref);
});

function getLayoutReport(original: StorageLayout, updated: StorageLayout) {
  const originalDetailed = getDetailedLayout(original);
  const updatedDetailed = getDetailedLayout(updated);
  const comparator = new StorageLayoutComparator();
  return comparator.compareLayouts(originalDetailed, updatedDetailed);
}

test('get summary report - empty ok', async t => {
  const report = getSummaryReport([], true);
  t.true(report.ok);
  t.is(report.explain(), '');
});

test('get summary report - ok - suppress', async t => {
  const consoleLog = console.log;
  const consoleError = console.error;
  const stubLog = sinon.stub();
  const stubError = sinon.stub();
  console.log = stubLog;
  console.error = stubError;

  try {
    const report = getSummaryReport([], true);
    t.is(stubLog.callCount, 0);
    t.is(stubError.callCount, 0);

    t.true(report.ok);
    t.is(report.explain(), '');
  } finally {
    console.log = consoleLog;
    console.error = consoleError;
  }
});

test('get summary report - ok - console', async t => {
  const consoleLog = console.log;
  const consoleError = console.error;
  const stubLog = sinon.stub();
  const stubError = sinon.stub();
  console.log = stubLog;
  console.error = stubError;

  try {
    const report = getSummaryReport([], false);
    t.is(stubLog.callCount, 1);
    t.regex(stubLog.getCall(0).args[0], /completed successfully/);
    t.is(stubError.callCount, 0);

    t.true(report.ok);
    t.is(report.explain(), '');
  } finally {
    console.log = consoleLog;
    console.error = consoleError;
  }
});

test('get summary report - errors - suppress', async t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Replace_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Replace_V2');
  const layoutReport = getLayoutReport(v1, v2);

  const consoleLog = console.log;
  const consoleError = console.error;
  const stubLog = sinon.stub();
  const stubError = sinon.stub();
  console.log = stubLog;
  console.error = stubError;

  try {
    const report = getSummaryReport(
      [
        new UpgradeableContractReport(
          'mypath/MyContract.sol:MyContract',
          undefined,
          new UpgradeableContractErrorReport([
            {
              src: 'MyContract.sol:10',
              kind: 'missing-public-upgradeto',
            },
            {
              src: 'MyContract.sol:20',
              kind: 'delegatecall',
            },
          ]),
          undefined,
        ),
        new UpgradeableContractReport(
          'MyContract2',
          'MyContract',
          new UpgradeableContractErrorReport([]),
          layoutReport,
        ),
      ],
      true,
    );
    t.is(stubLog.callCount, 0);
    t.is(stubError.callCount, 0);

    t.false(report.ok);
    t.snapshot(report.explain());
  } finally {
    console.log = consoleLog;
    console.error = consoleError;
  }
});

test('get summary report - errors - console', async t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Replace_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Replace_V2');
  const layoutReport = getLayoutReport(v1, v2);

  const consoleLog = console.log;
  const consoleError = console.error;
  const stubLog = sinon.stub();
  const stubError = sinon.stub();
  console.log = stubLog;
  console.error = stubError;

  try {
    const report = getSummaryReport(
      [
        new UpgradeableContractReport(
          'mypath/MyContract.sol:MyContract',
          undefined,
          new UpgradeableContractErrorReport([
            {
              src: 'MyContract.sol:10',
              kind: 'missing-public-upgradeto',
            },
            {
              src: 'MyContract.sol:20',
              kind: 'delegatecall',
            },
          ]),
          undefined,
        ),
        new UpgradeableContractReport(
          'MyContract2',
          'MyContract',
          new UpgradeableContractErrorReport([]),
          layoutReport,
        ),
      ],
      false,
    );
    t.is(stubLog.callCount, 0);
    t.is(stubError.callCount, 3);
    t.regex(stubError.getCall(0).args[0], /===/);
    t.regex(stubError.getCall(1).args[0], /Upgrade safety checks completed with the following errors:/);
    t.true(stubError.getCall(2).args[0].includes(report.explain()));

    t.false(report.ok);
    t.snapshot(report.explain());
  } finally {
    console.log = consoleLog;
    console.error = consoleError;
  }
});
