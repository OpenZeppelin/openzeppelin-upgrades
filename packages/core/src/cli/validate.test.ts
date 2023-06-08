import test from 'ava';

import { promises as fs } from 'fs';
import rimrafAsync from 'rimraf';
import path from 'path';
import os from 'os';
import util from 'util';
import minimist from 'minimist';
import { USAGE, DETAILS, getFunctionArgs, main, withDefaults } from './validate';
import sinon from 'sinon';
import { errorKinds } from '../validate/run';
import { artifacts } from 'hardhat';

const rimraf = util.promisify(rimrafAsync);

test.afterEach.always(() => {
  sinon.restore();
});

test.serial('help', t => {
  const parsedArgs = minimist(['validate', '--help']);
  const extraArgs = parsedArgs._;

  const consoleLog = sinon.stub(console, 'log');

  getFunctionArgs(parsedArgs, extraArgs);

  t.true(consoleLog.firstCall.calledWith(USAGE));
  t.true(consoleLog.secondCall.calledWith(DETAILS));
});

test.serial('no command', t => {
  const parsedArgs = minimist([]);
  const extraArgs = parsedArgs._;

  const consoleLog = sinon.stub(console, 'log');

  getFunctionArgs(parsedArgs, extraArgs);

  t.true(consoleLog.firstCall.calledWith(USAGE));
  t.true(consoleLog.secondCall.calledWith(DETAILS));
});

test('invalid command', t => {
  const parsedArgs = minimist(['invalid']);
  const extraArgs = parsedArgs._;
  t.throws(() => getFunctionArgs(parsedArgs, extraArgs), {
    message: `Invalid command: invalid. Supported commands are: validate`,
  });
});

test('command only', t => {
  const parsedArgs = minimist(['validate']);
  const extraArgs = parsedArgs._;
  const functionArgs = getFunctionArgs(parsedArgs, extraArgs);
  if (functionArgs === undefined) {
    t.fail();
  } else {
    t.is(functionArgs.buildInfoDir, undefined);
    t.is(functionArgs.opts.unsafeAllowRenames, false);
    t.is(functionArgs.opts.unsafeSkipStorageCheck, false);
    t.is(functionArgs.opts.unsafeAllowCustomTypes, false);
    t.is(functionArgs.opts.unsafeAllowLinkedLibraries, false);
    t.deepEqual(functionArgs.opts.unsafeAllow, []);
  }
});

test('command with arg', t => {
  const parsedArgs = minimist(['validate', 'build-info.json']);
  const extraArgs = parsedArgs._;
  const functionArgs = getFunctionArgs(parsedArgs, extraArgs);
  if (functionArgs === undefined) {
    t.fail();
  } else {
    t.is(functionArgs.buildInfoDir, 'build-info.json');
    t.is(functionArgs.opts.unsafeAllowRenames, false);
    t.is(functionArgs.opts.unsafeSkipStorageCheck, false);
    t.is(functionArgs.opts.unsafeAllowCustomTypes, false);
    t.is(functionArgs.opts.unsafeAllowLinkedLibraries, false);
    t.deepEqual(functionArgs.opts.unsafeAllow, []);
  }
});

test('invalid options', async t => {
  await t.throwsAsync(main(['validate', 'build-info.json', '--foo', '--bar', 'xyz']), {
    message: `Invalid options: foo, bar`,
  });
});

test('withDefaults - empty', t => {
  const parsedArgs = minimist(['validate', 'build-info.json']);
  const opts = withDefaults(parsedArgs);
  t.is(opts.unsafeAllowRenames, false);
  t.is(opts.unsafeSkipStorageCheck, false);
  t.is(opts.unsafeAllowCustomTypes, false);
  t.is(opts.unsafeAllowLinkedLibraries, false);
  t.deepEqual(opts.unsafeAllow, []);
});

test('withDefaults - some', t => {
  const parsedArgs = minimist(['validate', 'build-info.json', '--unsafeAllowRenames', '--unsafeAllow', 'selfdestruct']);
  const opts = withDefaults(parsedArgs);
  t.is(opts.unsafeAllowRenames, true);
  t.is(opts.unsafeSkipStorageCheck, false);
  t.is(opts.unsafeAllowCustomTypes, false);
  t.is(opts.unsafeAllowLinkedLibraries, false);
  t.deepEqual(opts.unsafeAllow, ['selfdestruct']);
});

test('withDefaults - all', t => {
  const parsedArgs = minimist([
    'validate',
    'build-info.json',
    '--unsafeAllowRenames',
    '--unsafeSkipStorageCheck',
    '--unsafeAllowCustomTypes',
    '--unsafeAllowLinkedLibraries',
    '--unsafeAllow',
    ...errorKinds,
  ]);
  const opts = withDefaults(parsedArgs);
  t.is(opts.unsafeAllowRenames, true);
  t.is(opts.unsafeSkipStorageCheck, true);
  t.is(opts.unsafeAllowCustomTypes, true);
  t.is(opts.unsafeAllowLinkedLibraries, true);
  t.true(opts.unsafeAllow.every((kind: string) => errorKinds.includes(kind as typeof errorKinds[number])));
});

test('withDefaults - invalid unsafeAllow', t => {
  const parsedArgs = minimist(['validate', 'build-info.json', '--unsafeAllow', 'foo']);
  t.throws(() => withDefaults(parsedArgs), {
    message: `Invalid option: --unsafeAllow "foo". Supported values for the --unsafeAllow option are: ${errorKinds.join(
      ', ',
    )}`,
  });
});

test.serial('main - errors', async t => {
  process.chdir(await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-')));
  await fs.mkdir('main-errors');

  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Validate.sol:Safe`);
  await fs.writeFile('main-errors/1.json', JSON.stringify(buildInfo));

  const consoleLogStub = sinon.stub(console, 'log');
  const consoleErrorStub = sinon.stub(console, 'error');

  const messages: string[] = [];

  consoleLogStub.callsFake((...args: string[]) => {
    messages.push(args.join(' '));
  });
  consoleErrorStub.callsFake((...args: string[]) => {
    messages.push(args.join(' '));
  });

  const exitCode = process.exitCode;
  try {
    await t.notThrowsAsync(main(['validate', 'main-errors']));
    t.is(process.exitCode, 1);

    t.true(consoleErrorStub.calledWith('\nUpgrade safety checks completed with the following errors:'));
    t.snapshot(messages);
  } finally {
    process.exitCode = exitCode;
    await rimraf(process.cwd());
  }
});

test.serial('main - no errors', async t => {
  process.chdir(await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-')));
  await fs.mkdir('main-no-errors');

  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/Storage088.sol:Storage088`);
  await fs.writeFile('main-no-errors/1.json', JSON.stringify(buildInfo));

  const consoleLogStub = sinon.stub(console, 'log');
  const consoleErrorStub = sinon.stub(console, 'error');

  const messages: string[] = [];

  consoleLogStub.callsFake((...args: string[]) => {
    messages.push(args.join(' '));
  });
  consoleErrorStub.callsFake((...args: string[]) => {
    messages.push(args.join(' '));
  });

  const exitCode = process.exitCode;
  try {
    await t.notThrowsAsync(main(['validate', 'main-no-errors']));
    t.is(process.exitCode, 0);

    t.true(consoleLogStub.calledWith('\nUpgrade safety checks completed successfully.'));
    t.snapshot(messages);
  } finally {
    process.exitCode = exitCode;
    await rimraf(process.cwd());
  }
});
