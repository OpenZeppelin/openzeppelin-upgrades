import minimist from 'minimist';

import { ValidateUpgradeSafetyOptions, validateUpgradeSafety } from '.';
import { withValidationDefaults } from '..';
import { ValidationError, errorKinds } from '../validate/run';
import debug from '../utils/debug';

const USAGE = 'Usage: npx @openzeppelin/upgrades-core validate [<BUILD_INFO_DIR>] [<OPTIONS>]';
const DETAILS = `
Detects upgradeable contracts from a build info directory and validates whether they are upgrade safe.

Arguments:
  <BUILD_INFO_DIR>  Optional path to the build info directory which contains JSON files with Solidity compiler input and output. Defaults to 'artifacts/build-info' for Hardhat projects or 'out/build-info' for Foundry projects. If your project uses a custom output directory, you must specify its build info directory here.

Options:
  --unsafeAllow "<VALIDATION_ERRORS>"  Selectively disable one or more validation errors. Comma-separated list with one or more of the following: ${errorKinds.join(
    ', ',
  )}
  --unsafeAllowRenames  Configure storage layout check to allow variable renaming.
  --unsafeSkipStorageCheck  Skips checking for storage layout compatibility errors. This is a dangerous option meant to be used as a last resort.`;

export async function main(args: string[]): Promise<void> {
  const { parsedArgs, extraArgs } = parseArgs(args);

  if (!help(parsedArgs, extraArgs)) {
    const functionArgs = getFunctionArgs(parsedArgs, extraArgs);
    const result = await validateUpgradeSafety(functionArgs.buildInfoDir, functionArgs.opts);
    console.log(result.explain());
    process.exitCode = result.ok ? 0 : 1;
  }
}

function parseArgs(args: string[]) {
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
  return { parsedArgs, extraArgs };
}

function help(parsedArgs: minimist.ParsedArgs, extraArgs: string[]): boolean {
  if (extraArgs.length === 0 || parsedArgs['help']) {
    console.log(USAGE);
    console.log(DETAILS);
    return true;
  } else {
    return false;
  }
}

interface FunctionArgs {
  buildInfoDir?: string;
  opts: Required<ValidateUpgradeSafetyOptions>;
}

/**
 * Gets and validates function arguments and options.
 * @returns Function arguments
 * @throws Error if any arguments or options are invalid.
 */
export function getFunctionArgs(parsedArgs: minimist.ParsedArgs, extraArgs: string[]): FunctionArgs {
  if (extraArgs.length === 0) {
    throw new Error('Missing command. Supported commands are: validate');
  } else if (extraArgs[0] !== 'validate') {
    throw new Error(`Invalid command: ${extraArgs[0]}. Supported commands are: validate`);
  } else if (extraArgs.length > 2) {
    throw new Error('The validate command takes only one argument: the build info directory.');
  } else {
    const buildInfoDir = extraArgs.length === 1 ? undefined : extraArgs[1];
    const opts = withDefaults(parsedArgs);
    return { buildInfoDir, opts };
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

export function withDefaults(parsedArgs: minimist.ParsedArgs): Required<ValidateUpgradeSafetyOptions> {
  validateOptions(parsedArgs);

  const allOpts: Required<ValidateUpgradeSafetyOptions> = {
    unsafeAllowRenames: parsedArgs['unsafeAllowRenames'],
    unsafeSkipStorageCheck: parsedArgs['unsafeSkipStorageCheck'],
    unsafeAllowCustomTypes: parsedArgs['unsafeAllowCustomTypes'],
    unsafeAllowLinkedLibraries: parsedArgs['unsafeAllowLinkedLibraries'],
    unsafeAllow: getUnsafeAllowKinds(parsedArgs['unsafeAllow']),
  };

  return withValidationDefaults(allOpts);
}
