import chalk from 'chalk';

import { ValidationError } from './run';

export interface ValidationOptions {
  unsafeAllowCustomTypes?: boolean;
  unsafeAllowLinkedLibraries?: boolean;
}

export function withValidationDefaults(opts: ValidationOptions): Required<ValidationOptions> {
  return {
    unsafeAllowCustomTypes: opts.unsafeAllowCustomTypes ?? false,
    unsafeAllowLinkedLibraries: opts.unsafeAllowLinkedLibraries ?? false,
  };
}

export function processExceptions(
  contractName: string,
  errorsToProcess: ValidationError[],
  opts: ValidationOptions,
): ValidationError[] {
  const { unsafeAllowCustomTypes, unsafeAllowLinkedLibraries } = withValidationDefaults(opts);
  let errors: ValidationError[] = errorsToProcess;

  // Process `unsafeAllowCustomTypes` flag
  if (unsafeAllowCustomTypes) {
    errors = processOverride(
      contractName,
      errors,
      ['enum-definition', 'struct-definition'],
      `    \`unsafeAllowCustomTypes\` may not be necessary.\n` +
        `    Update your plugin for automated struct and enum checks.\n`,
    );
  }

  // Process `unsafeAllowLinkedLibraries` flag
  if (unsafeAllowLinkedLibraries) {
    errors = processOverride(
      contractName,
      errors,
      ['external-library-linking'],
      `    You are using the \`unsafeAllowLinkedLibraries\` flag to include external libraries.\n` +
        `    Make sure you have manually checked that the linked libraries are upgrade safe.\n`,
    );
  }

  return errors;
}

function processOverride(
  contractName: string,
  errorsToProcess: ValidationError[],
  overrides: string[],
  message: string,
): ValidationError[] {
  let errors: ValidationError[] = errorsToProcess;
  let exceptionsFound = false;

  errors = errors.filter(error => {
    const isException = overrides.includes(error.kind);
    exceptionsFound = exceptionsFound || isException;
    return !isException;
  });

  if (exceptionsFound && !silenced) {
    console.error(
      chalk.keyword('orange').bold('Warning:') + ` Potentially unsafe deployment of ${contractName}\n\n` + message,
    );
  }

  return errors;
}

let silenced = false;

export function silenceWarnings(): void {
  if (!silenced) {
    console.error(
      chalk.keyword('orange').bold('Warning:') +
        ` All subsequent Upgrades warnings will be silenced.\n\n` +
        `    Make sure you have manually checked all uses of unsafe flags.\n`,
    );
    silenced = true;
  }
}

export function isSilencingWarnings(): boolean {
  return silenced;
}
