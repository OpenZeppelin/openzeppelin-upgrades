import minimist from 'minimist';

import { ValidateUpgradeSafetyOptions, validateUpgradeSafety } from '.';
import { ValidationError, convertToWarnings, errorKinds } from '../validate/run';
import debug from '../utils/debug';
import { withCliDefaults } from './validate/validate-upgrade-safety';

const USAGE = 'Usage: npx @openzeppelin/upgrades-core validate [<BUILD_INFO_DIR>] [<OPTIONS>]';
const DETAILS = `
Detects upgradeable contracts from a build info directory and validates whether they are upgrade safe.

Arguments:
  <BUILD_INFO_DIR>  Optional path to the build info directory which contains JSON files with Solidity compiler input and output. Defaults to 'artifacts/build-info' for Hardhat projects or 'out/build-info' for Foundry projects. If your project uses a custom output directory, you must specify its build info directory here.

Options:
  --contract <CONTRACT>  The name or fully qualified name of the contract to validate. If not specified, all upgradeable contracts in the build info directory will be validated.
  --reference <REFERENCE_CONTRACT>  Can only be used when the --contract option is also provided. The name or fully qualified name of the reference contract to use for storage layout comparisons. If not specified, uses the @custom:oz-upgrades-from annotation if it is defined in the contract that is being validated.
  --requireReference  Can only be used when the --contract option is also provided. Not compatible with --unsafeSkipStorageCheck. If specified, requires either the --reference option to be provided or the contract to have a @custom:oz-upgrades-from annotation.
  --referenceBuildInfoDirs "<BUILD_INFO_DIR>[,<BUILD_INFO_DIR>...]"  Optional paths of additional build info directories from previous versions of the project to use for storage layout comparisons. When using this option, refer to one of these directories using prefix '<dirName>:' before the contract name or fully qualified name in the --reference option or @custom:oz-upgrades-from annotation, where <dirName> is the directory short name. Each directory short name must be unique, including compared to the main build info directory. If passing in multiple directories, separate them with commas or call the option multiple times, once for each directory.
  --exclude "<GLOB_PATTERN>" [--exclude "<GLOB_PATTERN>"...]  Exclude validations for contracts in source file paths that match any of the given glob patterns. For example, --exclude "contracts/mocks/**/*.sol". Does not apply to reference contracts. If passing in multiple patterns, call the option multiple times, once for each pattern.
  --unsafeAllow "<VALIDATION_ERROR>[,<VALIDATION_ERROR>...]"  Selectively disable one or more validation errors or warnings. Comma-separated list with one or more of the following:
      Errors: ${errorKinds.filter(kind => !convertToWarnings.includes(kind)).join(', ')}
      Warnings: ${convertToWarnings.join(', ')}
  --unsafeAllowRenames  Configure storage layout check to allow variable renaming.
  --unsafeSkipStorageCheck  Skips checking for storage layout compatibility errors. This is a dangerous option meant to be used as a last resort.`;

export async function main(args: string[]): Promise<void> {
  const { parsedArgs, extraArgs } = parseArgs(args);

  if (!help(parsedArgs, extraArgs)) {
    const functionArgs = getFunctionArgs(parsedArgs, extraArgs);
    const result = await validateUpgradeSafety(
      functionArgs.buildInfoDir,
      functionArgs.contract,
      functionArgs.reference,
      functionArgs.opts,
      functionArgs.referenceBuildInfoDirs,
      functionArgs.exclude,
    );
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
      'requireReference',
    ],
    string: ['unsafeAllow', 'contract', 'reference', 'referenceBuildInfoDirs', 'exclude'],
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
  contract?: string;
  reference?: string;
  opts: Required<ValidateUpgradeSafetyOptions>;
  referenceBuildInfoDirs?: string[];
  exclude?: string[];
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
    const contract = getAndValidateString(parsedArgs, 'contract');
    const reference = getAndValidateString(parsedArgs, 'reference');
    const opts = withDefaults(parsedArgs);
    const referenceBuildInfoDirs = getAndValidateStringArray(parsedArgs, 'referenceBuildInfoDirs', true);
    const exclude = getAndValidateStringArray(parsedArgs, 'exclude', false);

    if (contract === undefined) {
      if (reference !== undefined) {
        throw new Error('The --reference option can only be used along with the --contract option.');
      } else if (opts.requireReference) {
        throw new Error('The --requireReference option can only be used along with the --contract option.');
      }
    }
    return { buildInfoDir, contract, reference, opts, referenceBuildInfoDirs, exclude };
  }
}

function getAndValidateString(parsedArgs: minimist.ParsedArgs, option: string): string | undefined {
  const value = parsedArgs[option];
  if (value !== undefined) {
    assertNonEmptyString(value, option);
  }
  return value;
}

function getAndValidateStringArray(
  parsedArgs: minimist.ParsedArgs,
  option: string,
  useCommaDelimiter: boolean,
): string[] | undefined {
  const value = parsedArgs[option];
  if (value !== undefined) {
    if (Array.isArray(value)) {
      return value;
    } else {
      assertNonEmptyString(value, option);
      if (useCommaDelimiter) {
        return value.split(/[\s,]+/);
      } else {
        return [value];
      }
    }
  }
  return value;
}

function assertNonEmptyString(value: unknown, option: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid option: --${option} cannot be empty`);
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
        'contract',
        'reference',
        'requireReference',
        'referenceBuildInfoDirs',
        'exclude',
      ].includes(key),
  );
  if (invalidArgs.length > 0) {
    throw new Error(`Invalid options: ${invalidArgs.join(', ')}`);
  }
}

function getUnsafeAllowKinds(parseArgs: minimist.ParsedArgs): ValidationError['kind'][] {
  type errorKindsType = (typeof errorKinds)[number];

  const unsafeAllowTokens: string[] = getAndValidateStringArray(parseArgs, 'unsafeAllow', true) ?? [];
  if (unsafeAllowTokens.some(token => !errorKinds.includes(token as errorKindsType))) {
    throw new Error(
      `Invalid option: --unsafeAllow "${parseArgs['unsafeAllow']}". Supported values for the --unsafeAllow option are: ${errorKinds.join(
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
    unsafeAllow: getUnsafeAllowKinds(parsedArgs),
    requireReference: parsedArgs['requireReference'],
  };

  return withCliDefaults(allOpts);
}
