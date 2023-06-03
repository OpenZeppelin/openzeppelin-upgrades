import test from 'ava';

import { promises as fs } from 'fs';
import rimrafAsync from 'rimraf';
import path from 'path';
import os from 'os';
import util from 'util';
import minimist from 'minimist';
import { USAGE, DETAILS, handleHelp, main, withDefaults } from './validate';
import sinon from 'sinon';
import { errorKinds } from '../validate/run';
import { artifacts } from 'hardhat';

const rimraf = util.promisify(rimrafAsync);

test('help', t => {
  const parsedArgs = minimist(['validate', '--help']);
  const extraArgs = parsedArgs._;

  const consoleLog = console.log;
  const stubLog = sinon.stub();
  console.log = stubLog;

  try {
    handleHelp(parsedArgs, extraArgs);
  } finally {
    console.log = consoleLog;
  }

  t.true(stubLog.firstCall.calledWith(USAGE));
  t.true(stubLog.secondCall.calledWith(DETAILS));
});

test('no arguments', t => {
  const parsedArgs = minimist([]);
  const extraArgs = parsedArgs._;

  const consoleLog = console.log;
  const stubLog = sinon.stub();
  console.log = stubLog;

  try {
    handleHelp(parsedArgs, extraArgs);
  } finally {
    console.log = consoleLog;
  }

  t.true(stubLog.firstCall.calledWith(USAGE));
  t.true(stubLog.secondCall.calledWith(DETAILS));
});

test('missing arguments', t => {
  const parsedArgs = minimist(['validate']);
  const extraArgs = parsedArgs._;
  t.throws(() => handleHelp(parsedArgs, extraArgs), { message: `Missing arguments. ${USAGE}` });
});

test('invalid command', t => {
  const parsedArgs = minimist(['invalid']);
  const extraArgs = parsedArgs._;
  t.throws(() => handleHelp(parsedArgs, extraArgs), {
    message: `Invalid command: invalid. Supported commands are: validate`,
  });
});

test('no help needed', t => {
  const parsedArgs = minimist(['validate', 'build-info.json']);
  const extraArgs = parsedArgs._;
  t.false(handleHelp(parsedArgs, extraArgs));
});

test('invalid options', t => {
  t.throws(() => main(['validate', 'build-info.json', '--foo', '--bar', 'xyz']), {
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

test('main', async t => {
  process.chdir(await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-')));

  const buildInfo = await artifacts.getBuildInfo(`contracts/test/cli/CLI.sol:Safe`);
  await fs.writeFile('main-build-info.json', JSON.stringify(buildInfo));

  const consoleLogSpy = sinon.stub(console, 'log');
  const consoleErrorSpy = sinon.stub(console, 'error');

  const messages: string[] = [];

  consoleLogSpy.callsFake((...args: string[]) => {
    messages.push(args.join(' '));
  });
  consoleErrorSpy.callsFake((...args: string[]) => {
    messages.push(args.join(' '));
  });

  try {
    t.notThrows(() => main(['validate', 'main-build-info.json']));
    t.is(process.exitCode, 1);

    t.true(consoleErrorSpy.calledWith('\nUpgrade safety checks completed with the following errors:'));
    t.snapshot(messages);
  } finally {
    process.exitCode = 0;
    await rimraf(process.cwd());
  }
});
