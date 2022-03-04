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
  'contracts/test/ValidationsNatspec.sol:RenameV1',
  'contracts/test/ValidationsNatspec.sol:RenameV2',
  'contracts/test/ValidationsNatspec.sol:RetypeV1',
  'contracts/test/ValidationsNatspec.sol:RetypeV2',
  'contracts/test/ValidationsNatspec.sol:WronglyReportedRetypeV3',
  'contracts/test/ValidationsNatspec.sol:MissmatchingTypeRetypeV4',
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
    for (const def of findAll('ContractDefinition', solcOutput.sources['contracts/test/ValidationsNatspec.sol'].ast)) {
      contracts[def.name] = def;
      deref[def.name] = astDereferencer(solcOutput);
      storageLayout[def.name] = (
        solcOutput.contracts['contracts/test/ValidationsNatspec.sol'][def.name] as any
      ).storageLayout;
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

test('succesful rename', t => {
  const v1 = t.context.extractStorageLayout('RenameV1');
  const v2 = t.context.extractStorageLayout('RenameV2');
  const report = getReport(v1, v2);
  t.true(report.ok);
  t.snapshot(report.explain());
});

test('succesful retype', t => {
  const v1 = t.context.extractStorageLayout('RetypeV1');
  const v2 = t.context.extractStorageLayout('RetypeV2');
  const report = getReport(v1, v2);
  t.true(report.ok);
  t.snapshot(report.explain());
});

test('wrongly reported retype', t => {
  const v1 = t.context.extractStorageLayout('RetypeV1');
  const v2 = t.context.extractStorageLayout('WronglyReportedRetypeV3');
  const report = getReport(v1, v2);
  t.false(report.ok);
  t.snapshot(report.explain());
});

test('rightly reported retype but incompatible new type', t => {
  const v1 = t.context.extractStorageLayout('RetypeV1');
  const v2 = t.context.extractStorageLayout('MissmatchingTypeRetypeV4');
  const report = getReport(v1, v2);
  t.false(report.ok);
  t.snapshot(report.explain());
});
