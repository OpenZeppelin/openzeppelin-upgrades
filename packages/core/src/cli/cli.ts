#!/usr/bin/env node

import minimist from 'minimist';

import { ValidateUpgradeSafetyOptions, validateUpgradeSafety } from './validate-upgrade-safety';
import { withValidationDefaults } from '..';
import { ValidationError } from '../validate/run';
import debug from '../utils/debug';

const USAGE = 'Usage: npx @openzeppelin/upgrades-core validate <build-info-files> [options]';
const DETAILS =
  '\n\nValidates that the contracts in a set of build info files are upgrade safe.' +
  '\n\nArguments:' +
  '\n  <build-info-files>  One or more paths to build info files' +
  '\n\nOptions:' +
  '\n  --unsafeAllowRenames  Configure storage layout check to allow variable renaming.' +
  '\n  --unsafeSkipStorageCheck  Skips checking for storage layout compatibility errors. This is a dangerous option meant to be used as a last resort.' +
  '\n  --unsafeAllow "<validation errors>"  Selectively disable one or more validation errors. Comma or space separated list of validation errors described in https://docs.openzeppelin.com/upgrades-plugins/1.x/api-hardhat-upgrades#common-options';

export function main(args: string[]): void {
  const parsedArgs = minimist(args);
  const extraArgs = parsedArgs._;

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
  if (extraArgs.length === 0 || parsedArgs['help'] || parsedArgs['h']) {
    console.log(USAGE);
    console.log(DETAILS);
    process.exit(0);
  } else if (extraArgs[0] !== 'validate') {
    console.error(`Invalid command: ${extraArgs[0]}. Supported commands are: validate`);
    process.exit(1);
  } else if (extraArgs.length === 1) {
    console.error(`Missing arguments. ${USAGE}`);
    process.exit(1);
  }
}

function withDefaults(args: minimist.ParsedArgs): Required<ValidateUpgradeSafetyOptions> {
  const unsafeAllow = args['unsafeAllow'] ? (args['unsafeAllow'].split(/[\s,]+/) as ValidationError['kind'][]) : [];

  const allOpts: Required<ValidateUpgradeSafetyOptions> = {
    unsafeAllowRenames: args['unsafeAllowRenames'],
    unsafeSkipStorageCheck: args['unsafeSkipStorageCheck'],
    unsafeAllowCustomTypes: args['unsafeAllowCustomTypes'],
    unsafeAllowLinkedLibraries: args['unsafeAllowLinkedLibraries'],
    unsafeAllow: unsafeAllow,
  };

  return withValidationDefaults(allOpts);
}
