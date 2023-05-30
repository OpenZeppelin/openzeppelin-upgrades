#!/usr/bin/env node

import minimist from 'minimist';

import { ValidateUpgradeSafetyOptions, validateUpgradeSafety } from './validate-upgrade-safety';
import { withValidationDefaults } from '..';
import { ValidationError } from '../validate/run';
import debug from '../utils/debug';

export function main(args: string[]): void {
  const parsedArgs = minimist(args);
  const extraArgs = parsedArgs._;

  const opts = withDefaults(parsedArgs);
  debug('opts', JSON.stringify(opts, null, 2));

  if (extraArgs.length === 0) {
    throw new Error('Expected arguments: <build-info-file-1> <build-info-file-2> ...');
  }

  const result = validateUpgradeSafety(extraArgs, undefined, opts);
  process.exit(result.ok ? 0 : 1);
}

void main(process.argv.slice(2));

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
