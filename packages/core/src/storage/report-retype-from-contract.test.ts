import _test, { TestFn } from 'ava';
import { ContractDefinition } from 'solidity-ast';
import { ASTDereferencer, findAll } from 'solidity-ast/utils';
import { artifacts } from 'hardhat';
import { astDereferencer } from '../ast-dereferencer';
import { extractStorageLayout } from './extract';
import { StorageLayoutComparator, stripContractSubstrings } from './compare';
import { StorageLayout, getDetailedLayout } from './layout';

interface Context {
  extractStorageLayout: (contract: string) => ReturnType<typeof extractStorageLayout>;
}

const test = _test as TestFn<Context>;

const dummyDecodeSrc = () => 'file.sol:1';
const testContracts = [
  'contracts/test/RetypeFromContract.sol:RetypeContractToUintV1',
  'contracts/test/RetypeFromContract.sol:RetypeContractToUintV2',
  'contracts/test/RetypeFromContract.sol:RetypeUintToContractV1',
  'contracts/test/RetypeFromContract.sol:RetypeUintToContractV2',
  'contracts/test/RetypeFromContract.sol:RetypeContractToUintMappingV1',
  'contracts/test/RetypeFromContract.sol:RetypeContractToUintMappingV2',
  'contracts/test/RetypeFromContract.sol:RetypeUintToContractMappingV1',
  'contracts/test/RetypeFromContract.sol:RetypeUintToContractMappingV2',
  'contracts/test/RetypeFromContract.sol:ImplicitRetypeV1',
  'contracts/test/RetypeFromContract.sol:ImplicitRetypeV2',
  'contracts/test/RetypeFromContract.sol:ImplicitRetypeMappingV1',
  'contracts/test/RetypeFromContract.sol:ImplicitRetypeMappingV2',
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
    for (const def of findAll('ContractDefinition', solcOutput.sources['contracts/test/RetypeFromContract.sol'].ast)) {
      contracts[def.name] = def;
      deref[def.name] = astDereferencer(solcOutput);
      storageLayout[def.name] = (
        solcOutput.contracts['contracts/test/RetypeFromContract.sol'][def.name] as any
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

test('retype contract to uint', t => {
  const v1 = t.context.extractStorageLayout('RetypeContractToUintV1');
  const v2 = t.context.extractStorageLayout('RetypeContractToUintV2');
  const report = getReport(v1, v2);
  t.true(report.ok, report.explain());
});

test('retype uint to contract', t => {
  const v1 = t.context.extractStorageLayout('RetypeUintToContractV1');
  const v2 = t.context.extractStorageLayout('RetypeUintToContractV2');
  const report = getReport(v1, v2);
  t.true(report.ok, report.explain());
});

test('retype contract to uint mapping', t => {
  const v1 = t.context.extractStorageLayout('RetypeContractToUintMappingV1');
  const v2 = t.context.extractStorageLayout('RetypeContractToUintMappingV2');
  const report = getReport(v1, v2);
  t.true(report.ok, report.explain());
});

test('retype uint to contract mapping', t => {
  const v1 = t.context.extractStorageLayout('RetypeUintToContractMappingV1');
  const v2 = t.context.extractStorageLayout('RetypeUintToContractMappingV2');
  const report = getReport(v1, v2);
  t.true(report.ok, report.explain());
});

test('implicit retype', t => {
  const v1 = t.context.extractStorageLayout('ImplicitRetypeV1');
  const v2 = t.context.extractStorageLayout('ImplicitRetypeV2');
  const report = getReport(v1, v2);
  t.true(report.ok, report.explain());
});

test('implicit retype mapping', t => {
  const v1 = t.context.extractStorageLayout('ImplicitRetypeMappingV1');
  const v2 = t.context.extractStorageLayout('ImplicitRetypeMappingV2');
  const report = getReport(v1, v2);
  t.true(report.ok, report.explain());
});

test('strip contract substrings', t => {
  t.is(stripContractSubstrings(undefined), undefined);
  t.is(stripContractSubstrings('address'), 'address');
  t.is(stripContractSubstrings('CustomContract'), 'CustomContract');
  t.is(stripContractSubstrings('contract CustomContract'), 'CustomContract');
  t.is(stripContractSubstrings('mapping(uint8 => CustomContract)'), 'mapping(uint8 => CustomContract)');
  t.is(stripContractSubstrings('mapping(uint8 => contract CustomContract)'), 'mapping(uint8 => CustomContract)');
  t.is(stripContractSubstrings('mapping(contract CustomContract => uint8)'), 'mapping(CustomContract => uint8)');
  t.is(stripContractSubstrings('mapping(contract A => contract B)'), 'mapping(A => B)');
  t.is(stripContractSubstrings('mapping(Substringcontract => address)'), 'mapping(Substringcontract => address)');
  t.is(
    stripContractSubstrings('mapping(contract Substringcontract => address)'),
    'mapping(Substringcontract => address)',
  );
});
