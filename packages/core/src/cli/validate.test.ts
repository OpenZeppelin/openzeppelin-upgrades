import test from 'ava';
import minimist from 'minimist';
import { USAGE, DETAILS, handleHelp } from './validate';
import sinon from 'sinon';

test('help command', t => {
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
  t.throws(() => handleHelp(parsedArgs, extraArgs), { message: `Invalid command: invalid. Supported commands are: validate` });
});

test('no help needed', t => {
  const parsedArgs = minimist(['validate', 'build-info.json']);
  const extraArgs = parsedArgs._;
  t.false(handleHelp(parsedArgs, extraArgs));
});