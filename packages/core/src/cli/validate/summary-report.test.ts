import { getSummaryReport } from './summary-report';
import { UpgradeableContractErrorReport } from '../../validate';

import _test, { TestFn } from 'ava';
import { ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { artifacts } from 'hardhat';

import { SolcOutput } from '../../solc-api';
import { astDereferencer } from '../../ast-dereferencer';
import { extractStorageLayout } from '../../storage/extract';
import { StorageLayoutComparator } from '../../storage/compare';
import { StorageLayout, getDetailedLayout } from '../../storage/layout';

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

test('get summary report - empty', async t => {
  const report = getSummaryReport([], true);
  t.true(report.ok);
  t.is(report.explain(), '');
});

test('get summary report - no errors', async t => {
  const report = getSummaryReport(
    [
      {
        contract: 'mypath/MyContract.sol:MyContract',
        standaloneReport: new UpgradeableContractErrorReport([]),
      }
    ],
    true,
  );
  t.true(report.ok);
  t.is(report.explain(), '');
});

test('get summary report - errors', async t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Replace_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Replace_V2');
  const layoutReport = getLayoutReport(v1, v2);

  const report = getSummaryReport(
    [
      {
        contract: 'mypath/MyContract.sol:MyContract',
        standaloneReport: new UpgradeableContractErrorReport([
          {
            src: 'MyContract.sol:10',
            kind: 'missing-public-upgradeto',
          },
          {
            src: 'MyContract.sol:20',
            kind: 'delegatecall',
          },
        ]),
      },
      {
        contract: 'MyContract2',
        reference: 'MyContract',
        standaloneReport: new UpgradeableContractErrorReport([]),
        storageLayoutReport: layoutReport,
      },
    ],
    true,
  );
  t.false(report.ok);
  t.snapshot(report.explain());
  // TODO test console output or add a test for it
});
