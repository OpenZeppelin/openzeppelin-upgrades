import minimist from 'minimist';

import { ValidateUpgradeSafetyOptions, validateUpgradeSafety } from '.';
import { withValidationDefaults } from '..';
import { ValidationError, errorKinds } from '../validate/run';
import debug from '../utils/debug';

export const USAGE = 'Usage: npx @openzeppelin/upgrades-core validate [<BUILD_INFO_DIR>] [<OPTIONS>]';
export const DETAILS =
  '\nDetects upgradeable contracts from a build info directory and validates whether they are upgrade safe.' +
  '\n\nArguments:' +
  "\n  <BUILD_INFO_DIR>  Optional path to the build info directory which contains JSON files with Solidity compiler input and output. Defaults to 'artifacts/build-info' for Hardhat projects or 'out/build-info' for Foundry projects. If your project uses a custom output directory, you must specify its build info directory here." +
  '\n\nOptions:' +
  `\n  --unsafeAllow "<VALIDATION_ERRORS>"  Selectively disable one or more validation errors. Comma or space separated list with one or more of the following: ${errorKinds.join(
    ', ',
  )}` +
  '\n  --unsafeAllowRenames  Configure storage layout check to allow variable renaming.' +
  '\n  --unsafeSkipStorageCheck  Skips checking for storage layout compatibility errors. This is a dangerous option meant to be used as a last resort.';

export async function main(args: string[]): Promise<void> {
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

  if (handleHelp(parsedArgs, extraArgs)) {
    return;
  }

  const buildInfoFilePaths = extraArgs.slice(1, extraArgs.length);
  debug('buildInfoFilePaths', JSON.stringify(buildInfoFilePaths, null, 2));

  const opts = withDefaults(parsedArgs);
  debug('opts', JSON.stringify(opts, null, 2));

  const result = await validateUpgradeSafety(buildInfoFilePaths, undefined, opts);
  process.exitCode = result.ok ? 0 : 1;
}

/**
 * Prints help if the --help option is present or if there are no arguments.
 * @returns True if help was printed, false otherwise.
 * @throws Error if the wrong subcommand is used, or if there are missing arguments for the 'validate' subcommand.
 */
export function handleHelp(parsedArgs: minimist.ParsedArgs, extraArgs: string[]): boolean {
  if (extraArgs.length === 0 || parsedArgs['help']) {
    console.log(USAGE);
    console.log(DETAILS);
    return true;
  } else if (extraArgs[0] !== 'validate') {
    throw new Error(`Invalid command: ${extraArgs[0]}. Supported commands are: validate`);
  } else if (extraArgs.length === 1) {
    throw new Error(`Missing arguments. ${USAGE}`);
  } else {
    return false;
  }
}

function validateOptions(parsedArgs: minimist.ParsedArgs) {
  const invalidArgs = Object.keys(parsedArgs).filter(
    key =>
      ![
        'help',
        'h',
        '_',
        'unsafeAllowRenames',
        'unsafeSkipStorageCheck',
        'unsafeAllowCustomTypes',
        'unsafeAllowLinkedLibraries',
        'unsafeAllow',
      ].includes(key),
  );
  if (invalidArgs.length > 0) {
    throw new Error(`Invalid options: ${invalidArgs.join(', ')}`);
  }
}

export function withDefaults(args: minimist.ParsedArgs): Required<ValidateUpgradeSafetyOptions> {
  validateOptions(args);

  const allOpts: Required<ValidateUpgradeSafetyOptions> = {
    unsafeAllowRenames: args['unsafeAllowRenames'],
    unsafeSkipStorageCheck: args['unsafeSkipStorageCheck'],
    unsafeAllowCustomTypes: args['unsafeAllowCustomTypes'],
    unsafeAllowLinkedLibraries: args['unsafeAllowLinkedLibraries'],
    unsafeAllow: getUnsafeAllowKinds(args['unsafeAllow']),
  };

  return withValidationDefaults(allOpts);
}

function getUnsafeAllowKinds(unsafeAllow: string | undefined): ValidationError['kind'][] {
  type errorKindsType = typeof errorKinds[number];

  if (unsafeAllow === undefined) {
    return [];
  }

  const unsafeAllowTokens: string[] = unsafeAllow.split(/[\s,]+/);
  if (unsafeAllowTokens.some(token => !errorKinds.includes(token as errorKindsType))) {
    // This includes empty strings
    throw new Error(
      `Invalid option: --unsafeAllow "${unsafeAllow}". Supported values for the --unsafeAllow option are: ${errorKinds.join(
        ', ',
      )}`,
    );
  }
  return unsafeAllowTokens as errorKindsType[];
}
