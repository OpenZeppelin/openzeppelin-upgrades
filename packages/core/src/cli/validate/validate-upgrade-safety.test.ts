import test from 'ava';

import { promises as fs } from 'fs';
import rimrafAsync from 'rimraf';
import util from 'util';
import path from 'path';
import os from 'os';

import { artifacts } from 'hardhat';
import { validateUpgradeSafety, withReportDefaults } from './validate-upgrade-safety';

const rimraf = util.promisify(rimrafAsync);

test.before(async () => {
  process.chdir(await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-')));
});

test.after(async () => {
  await rimraf(process.cwd());
});

test('validate upgrade safety', async t => {
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/CLI.sol:Safe`);
  await fs.writeFile('cli-build-info.json', JSON.stringify(buildInfo));

  const report = validateUpgradeSafety(['cli-build-info.json']);
  t.false(report.ok);
  t.snapshot(report.explain());
});

test('ambiguous upgrades-from', async t => {
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/CLI.sol:Safe`);
  await fs.writeFile('cli-build-info-1.json', JSON.stringify(buildInfo));
  await fs.writeFile('cli-build-info-2.json', JSON.stringify(buildInfo));

  const error = t.throws(() => validateUpgradeSafety(['cli-build-info-1.json', 'cli-build-info-2.json']));
  t.true(error?.message.includes('Found multiple contracts with name'), error?.message);
});

test('bad upgrade from 0.8.8 to 0.8.9', async t => {
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Storage088.sol:Storage088`);
  await fs.writeFile('storage088.json', JSON.stringify(buildInfo));

  const buildInfo2 = await artifacts.getBuildInfo(`contracts/test/cli/Storage089.sol:Storage089`);
  await fs.writeFile('storage089.json', JSON.stringify(buildInfo2));

  const report = validateUpgradeSafety(['storage088.json', 'storage089.json']);
  t.false(report.ok);
  t.snapshot(report.explain());
});

test('with report defaults', async t => {
  t.is(true, withReportDefaults({ suppressSummary: true }).suppressSummary);
  t.is(false, withReportDefaults({ suppressSummary: false }).suppressSummary);
  t.is(false, withReportDefaults({}).suppressSummary);
});
