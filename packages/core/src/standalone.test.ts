import _test, { TestInterface } from 'ava';
import { artifacts } from 'hardhat';

import { SolcInput, SolcOutput } from './solc-api';
import { UpgradeableContract } from './standalone';

interface Context {
  solcInput: SolcInput;
  solcOutput: SolcOutput;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const buildInfo = await artifacts.getBuildInfo('contracts/test/Standalone.sol:StandaloneV1');
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }
  t.context.solcInput = buildInfo.input;
  t.context.solcOutput = buildInfo.output;
});

test('reports unsafe operation', t => {
  const impl = new UpgradeableContract('StandaloneV1', t.context.solcInput, t.context.solcOutput);
  const report = impl.getErrorReport();
  t.false(report.ok);
  t.true(report.errors[0].kind === 'delegatecall');
});

test('reports storage upgrade errors', t => {
  const v1 = new UpgradeableContract('StandaloneV1', t.context.solcInput, t.context.solcOutput);

  const v2Good = new UpgradeableContract('StandaloneV2Good', t.context.solcInput, t.context.solcOutput);
  const goodReport = v1.getStorageUpgradeReport(v2Good);
  t.true(goodReport.ok);

  const v2Bad = new UpgradeableContract('StandaloneV2Bad', t.context.solcInput, t.context.solcOutput);
  const badReport = v1.getStorageUpgradeReport(v2Bad);
  t.false(badReport.ok);
});
