import test, { ExecutionContext } from 'ava';
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

async function getTempDir(t: ExecutionContext) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-'));
  t.teardown(() => rimraf(temp));
  return temp;
}

test('help', async t => {
  const output = (await execAsync(`${CLI} validate --help`)).stdout;
  t.snapshot(output);
});

test('no args', async t => {
  const output = (await execAsync(CLI)).stdout;
  t.snapshot(output);
});

test('validate - errors', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:Safe`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const error = await t.throwsAsync(execAsync(`${CLI} validate ${temp}`));
  const expectation: string[] = [`Stdout: ${(error as any).stdout}`, `Stderr: ${(error as any).stderr}`];
  t.snapshot(expectation.join('\n'));
});

test('validate - no upgradeable', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Storage088.sol:Storage088`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const output = (await execAsync(`${CLI} validate ${temp}`)).stdout;
  t.snapshot(output);
});

test('validate - ok', async t => {
  const temp = await getTempDir(t);
  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Annotation.sol:Annotation`);
  await fs.writeFile(path.join(temp, 'validate.json'), JSON.stringify(buildInfo));

  const output = (await execAsync(`${CLI} validate ${temp}`)).stdout;
  t.snapshot(output);
});
