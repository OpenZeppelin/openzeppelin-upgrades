import _test, { TestFn } from 'ava';
import { ContractDefinition } from 'solidity-ast';
import { ASTDereferencer, findAll } from 'solidity-ast/utils';
import { artifacts } from 'hardhat';
import { astDereferencer } from '../ast-dereferencer';
import { extractStorageLayout } from './extract';
import { StorageLayoutComparator } from './compare';
import { StorageLayout, getDetailedLayout } from './layout';

interface Context {
  extractStorageLayout: (contract: string) => ReturnType<typeof extractStorageLayout>;
}

const test = _test as TestFn<Context>;

const dummyDecodeSrc = () => 'file.sol:1';
const testContracts = [
  'contracts/test/Storage.sol:StorageUpgrade_Gap_V1',
  'contracts/test/Storage.sol:StorageUpgrade_Gap_V2_Ok',
  'contracts/test/Storage.sol:StorageUpgrade_Gap_V2_Bad1',
  'contracts/test/Storage.sol:StorageUpgrade_Gap_V2_Bad2',
  'contracts/test/Storage.sol:StorageUpgrade_Gap_V2_Bad3',
  'contracts/test/Storage.sol:StorageUpgrade_Gap_V2_Bad4',
  'contracts/test/Storage.sol:StorageUpgrade_Gap_V2_Bad5',
  'contracts/test/Storage.sol:StorageUpgrade_MultiConsumeGap_V1',
  'contracts/test/Storage.sol:StorageUpgrade_MultiConsumeGap_V2_Ok',
];

test.before(async t => {
  const contracts: Record<string, ContractDefinition> = {};
  const deref: Record<string, ASTDereferencer> = {};
  const storageLayout: Record<string, StorageLayout> = {};
  for (const contract of testContracts) {
    const buildInfo = await artifacts.getBuildInfo(contract);
    if (buildInfo === undefined) {
      throw new Error(`Build info not found for contract ${contract}`);
    }
    const solcOutput = buildInfo.output;
    for (const def of findAll('ContractDefinition', solcOutput.sources['contracts/test/Storage.sol'].ast)) {
      contracts[def.name] = def;
      deref[def.name] = astDereferencer(solcOutput);
      storageLayout[def.name] = (solcOutput.contracts['contracts/test/Storage.sol'][def.name] as any).storageLayout;
    }
  }

  t.context.extractStorageLayout = name =>
    extractStorageLayout(contracts[name], dummyDecodeSrc, deref[name], storageLayout[name]);
});

function getReport(original: StorageLayout, updated: StorageLayout) {
  const originalDetailed = getDetailedLayout(original);
  const updatedDetailed = getDetailedLayout(updated);
  const comparator = new StorageLayoutComparator();
  return comparator.compareLayouts(originalDetailed, updatedDetailed);
}

test('shrinkgap', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Gap_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Gap_V2_Ok');
  const report = getReport(v1, v2);
  t.true(report.ok);
  t.is(report.explain(), '');
});

test('finishgap', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_MultiConsumeGap_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_MultiConsumeGap_V2_Ok');
  const report = getReport(v1, v2);
  t.true(report.ok);
  t.is(report.explain(), '');
});

test('insert var without shrink gap', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Gap_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Gap_V2_Bad1');
  const report = getReport(v1, v2);
  t.false(report.ok);
  t.snapshot(report.explain());
});

test('delete var and expand gap', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Gap_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Gap_V2_Bad2');
  const report = getReport(v1, v2);
  t.false(report.ok);
  t.snapshot(report.explain());
});

test('shrink gap without adding var', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Gap_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Gap_V2_Bad3');
  const report = getReport(v1, v2);
  t.false(report.ok);
  t.snapshot(report.explain());
});

test('insert var and shrink gap too much', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Gap_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Gap_V2_Bad4');
  const report = getReport(v1, v2);
  t.false(report.ok);
  t.snapshot(report.explain());
});

test('insert vars and shrink gap not enough', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Gap_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Gap_V2_Bad5');
  const report = getReport(v1, v2);
  t.false(report.ok);
  t.snapshot(report.explain());
});

test('insert vars without shrink gap (uint128)', t => {
  const v1 = t.context.extractStorageLayout('StorageUpgrade_Uint128Gap_V1');
  const v2 = t.context.extractStorageLayout('StorageUpgrade_Uint128Gap_V2_Bad');
  const report = getReport(v1, v2);
  t.false(report.ok);
  t.snapshot(report.explain());
});
