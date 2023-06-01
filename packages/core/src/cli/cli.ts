#!/usr/bin/env node

import minimist from 'minimist';

import { ValidateUpgradeSafetyOptions, validateUpgradeSafety } from './validate-upgrade-safety';
import { withValidationDefaults } from '..';
import { ValidationError, errorKinds } from '../validate/run';
import debug from '../utils/debug';

const USAGE = 'Usage: npx @openzeppelin/upgrades-core validate <build-info-files> [options]';
const DETAILS =
  '\nDetects upgradeable contracts from a set of build info files and validates that they are upgrade safe.' +
  '\n\nArguments:' +
  '\n  <build-info-files>  One or more paths to build info JSON files which contain Solidity compiler input and output sections.' +
  '\n\nOptions:' +
  '\n  --unsafeAllowRenames  Configure storage layout check to allow variable renaming.' +
  '\n  --unsafeSkipStorageCheck  Skips checking for storage layout compatibility errors. This is a dangerous option meant to be used as a last resort.' +
  `\n  --unsafeAllow "<validation errors>"  Comma or space separated list to selectively disable one or more validation errors. Supported values are: ${errorKinds.join(
    ', ',
  )}`;

export function main(args: string[]): void {
  const parsedArgs = minimist(args, {
    boolean: [
      'help',
      'unsafeAllowRenames',
      'unsafeSkipStorageCheck',
      'unsafeAllowCustomTypes',
      'unsafeAllowLinkedLibraries',
    ],
    string: ['unsafeAllow'],
    alias: { h: 'help' },
  });
  const extraArgs = parsedArgs._;
  debug('parsedArgs', parsedArgs);

  handleHelp(parsedArgs, extraArgs);

  const buildInfoFilePaths = extraArgs.slice(1, extraArgs.length);
  debug('buildInfoFilePaths', JSON.stringify(buildInfoFilePaths, null, 2));

  const opts = withDefaults(parsedArgs);
  debug('opts', JSON.stringify(opts, null, 2));

  const result = validateUpgradeSafety(buildInfoFilePaths, undefined, opts);
  process.exit(result.ok ? 0 : 1);
}

void main(process.argv.slice(2));

function handleHelp(parsedArgs: minimist.ParsedArgs, extraArgs: string[]) {
  if (extraArgs.length === 0 || parsedArgs['help']) {
    console.log(USAGE);
    console.log(DETAILS);
    process.exit(0);
  } else if (extraArgs[0] !== 'validate') {
    exitWithError(`Invalid command: ${extraArgs[0]}. Supported commands are: validate`);
  } else if (extraArgs.length === 1) {
    exitWithError(`Missing arguments. ${USAGE}`);
  }
}

function withDefaults(args: minimist.ParsedArgs): Required<ValidateUpgradeSafetyOptions> {
  const allOpts: Required<ValidateUpgradeSafetyOptions> = {
    unsafeAllowRenames: args['unsafeAllowRenames'],
    unsafeSkipStorageCheck: args['unsafeSkipStorageCheck'],
    unsafeAllowCustomTypes: args['unsafeAllowCustomTypes'],
    unsafeAllowLinkedLibraries: args['unsafeAllowLinkedLibraries'],
    unsafeAllow: getUnsafeAllowKinds(args['unsafeAllow']),
  };

  return withValidationDefaults(allOpts);
}

function getUnsafeAllowKinds(unsafeAllow: string): ValidationError['kind'][] {
  type errorKindsType = typeof errorKinds[number];

  const unsafeAllowTokens: string[] = unsafeAllow.split(/[\s,]+/);
  if (unsafeAllowTokens.some(token => !errorKinds.includes(token as errorKindsType))) {
    // This includes empty strings
    exitWithError(
      `Invalid option: --unsafeAllow "${unsafeAllow}". Supported values for the --unsafeAllow option are: ${errorKinds.join(
        ', ',
      )}`,
    );
  }
  return unsafeAllowTokens as errorKindsType[];
}

function exitWithError(message: string): never {
  console.error(message);
  process.exit(1);
}
