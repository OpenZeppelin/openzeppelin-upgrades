import test from 'ava';
import { promisify } from 'util';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import rimrafAsync from 'rimraf';
import { artifacts } from 'hardhat';

const execAsync = promisify(exec);
const rimraf = promisify(rimrafAsync);

const CLI = 'node dist/cli/cli.js';

test('help', async t => {
  const output = (await execAsync(`${CLI} validate --help`)).stdout;
  t.snapshot(output);
});

test('no args', async t => {
  const output = (await execAsync(CLI)).stdout;
  t.snapshot(output);
});

test('invalid options', async t => {
  const error = await t.throwsAsync(execAsync(`${CLI} validate build-info.json --foo --bar xyz`));
  t.true((error as any).stderr.includes('Invalid options: foo, bar'));
});

test('invalid command', async t => {
  const error = await t.throwsAsync(execAsync(`${CLI} invalid`));
  t.true((error as any).stderr.includes('Invalid command: invalid. Supported commands are: validate'));
});

test('validate - errors', async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-'));
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:Safe`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  try {
    const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp}`));
    const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
    t.snapshot(expectation.join('\n'));
  } finally {
    await rimraf(temp);
  }
});

test('validate - no upgradeable', async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-'));
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Storage088.sol:Storage088`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  try {
    const output = (await execAsync(`${CLI} validate ${temp}`)).stdout;
    t.snapshot(output);
  } finally {
    await rimraf(temp);
  }
});

test('validate - ok', async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-'));
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Annotation.sol:Annotation`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  try {
    const output = (await execAsync(`${CLI} validate ${temp}`)).stdout;
    t.snapshot(output);
  } finally {
    await rimraf(temp);
  }
});
