import _test, { ExecutionContext, TestFn } from 'ava';

import { artifacts } from 'hardhat';
import { validateBuildInfoContracts } from './validations';
import { UpgradeableContractReport, getContractReports } from './contract-report';
import { withCliDefaults } from './validate-upgrade-safety';

interface Context {
  reports: Map<string, UpgradeableContractReport[]>;
}

const test = _test as TestFn<Context>;

const SOURCE_FILE = 'contracts/test/cli/Validate.sol';
const SOURCE_FILE_SELFDESTRUCT = 'contracts/test/cli/ValidateSelfdestruct.sol';

test.before(async t => {
  t.context.reports = new Map();
  for (const sourceFile of [SOURCE_FILE, SOURCE_FILE_SELFDESTRUCT]) {
    const hardhatBuildInfo = await artifacts.getBuildInfo(`${sourceFile}:Safe`);

    if (hardhatBuildInfo === undefined) {
      t.fail();
    } else {
      const buildInfoFile = {
        ...hardhatBuildInfo,
        dirShortName: 'build-info',
      };
      const sourceContracts = validateBuildInfoContracts([buildInfoFile]);
      t.context.reports.set(sourceFile, getContractReports({ '': sourceContracts }, withCliDefaults({})));
    }
  }
});

function getReport(t: ExecutionContext<Context>, contractName: string, sourceFile: string) {
  return t.context.reports.get(sourceFile)?.find(r => r.contract === `${sourceFile}:${contractName}`);
}

function assertReport(
  t: ExecutionContext<Context>,
  report: UpgradeableContractReport | undefined,
  valid: boolean | undefined,
) {
  if (valid === undefined) {
    t.true(report === undefined);
  } else if (valid === true) {
    t.true(report !== undefined);
    t.true(report?.ok);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    t.regex(report!.explain(), /✔/);
  } else if (valid === false) {
    t.true(report !== undefined);
    t.false(report?.ok);
    t.snapshot(report?.explain());
  }
}

function testValid(name: string, sourceFile: string, valid: boolean | undefined) {
  const expectationString = valid === undefined ? 'ignores' : valid ? 'accepts' : 'rejects';
  const testName = [expectationString, name].join(' ');
  test(testName, t => {
    const report = getReport(t, name, sourceFile);
    assertReport(t, report, valid);
  });
}

testValid('Safe', SOURCE_FILE, true);
testValid('MultipleUnsafe', SOURCE_FILE_SELFDESTRUCT, false);
testValid('NonUpgradeable', SOURCE_FILE, undefined);
testValid('HasInitializer', SOURCE_FILE, true);
testValid('HasUpgradeTo', SOURCE_FILE, true);
testValid('HasUpgradeToConstructorUnsafe', SOURCE_FILE, false);
testValid('InheritsMultipleUnsafe', SOURCE_FILE_SELFDESTRUCT, false);
testValid('UpgradesFromUUPS', SOURCE_FILE, false);
testValid('UpgradesFromTransparent', SOURCE_FILE, true);
testValid('UnsafeAndStorageLayoutErrors', SOURCE_FILE_SELFDESTRUCT, false);
testValid('BecomesSafe', SOURCE_FILE_SELFDESTRUCT, true);
testValid('BecomesBadLayout', SOURCE_FILE_SELFDESTRUCT, false);
testValid('StillUnsafe', SOURCE_FILE_SELFDESTRUCT, false);
testValid('AbstractUpgradeable', SOURCE_FILE, undefined);
testValid('InheritsAbstractUpgradeable', SOURCE_FILE, true);
