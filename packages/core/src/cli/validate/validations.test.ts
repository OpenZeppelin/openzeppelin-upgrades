import _test, { ExecutionContext, TestFn } from 'ava';

import { artifacts } from 'hardhat';
import { validateBuildInfoContracts } from './validations';
import { UpgradeableContractReport } from './contract-report';

interface Context {
  reports: UpgradeableContractReport[];
}

const test = _test as TestFn<Context>;

const SOURCE_FILE = 'contracts/test/cli/CLI.sol';

test.before(async t => {
  const buildInfo = await artifacts.getBuildInfo(`${SOURCE_FILE}:Safe`);

  if (buildInfo === undefined) {
    t.fail();
  } else {
    t.context.reports = validateBuildInfoContracts([buildInfo], {});
  }
});

function getReport(t: ExecutionContext<Context>, contractName: string) {
  return t.context.reports.find(r => r.contract === `${SOURCE_FILE}:${contractName}`);
}

function assertReport(
  t: ExecutionContext<Context>,
  report: UpgradeableContractReport | undefined,
  expectation: boolean | undefined,
) {
  if (expectation === undefined) {
    t.true(report === undefined);
  } else if (expectation === true) {
    t.true(report !== undefined);
    t.true(report?.ok);
    t.is(report?.explain(), '');
  } else if (expectation === false) {
    t.true(report !== undefined);
    t.false(report?.ok);
    t.snapshot(report?.explain());
  }
}

test('Safe', async t => {
  const report = getReport(t, 'Safe');
  assertReport(t, report, true);
});

test('MultipleUnsafe', async t => {
  const report = getReport(t, 'MultipleUnsafe');
  assertReport(t, report, false);
});

test('NonUpgradeable', async t => {
  const report = getReport(t, 'NonUpgradeable');
  assertReport(t, report, undefined);
});

test('HasInitializer', async t => {
  const report = getReport(t, 'HasInitializer');
  assertReport(t, report, true);
});

test('HasUpgradeTo', async t => {
  const report = getReport(t, 'HasUpgradeTo');
  assertReport(t, report, true);
});

test('HasUpgradeToConstructorUnsafe', async t => {
  const report = getReport(t, 'HasUpgradeToConstructorUnsafe');
  assertReport(t, report, false);
});
