import chalk from 'chalk';

import { ValidationError } from './run';

export interface ValidationOptions {
  unsafeAllowCustomTypes?: boolean;
  unsafeAllowLinkedLibraries?: boolean;
  unsafeAllow?: ValidationError['kind'][];
}

export const ValidationErrorUnsafeMessages: Record<ValidationError['kind'], string | undefined> = {
  'state-variable-assignment': `    You are using the \`unsafeAllow.state-variable-assignment\` flag.\n`,
  'state-variable-immutable': `    You are using the \`unsafeAllow.state-variable-immutable\` flag.\n`,
  'external-library-linking':
    `    You are using the \`unsafeAllow.external-library-linking\` flag to include external libraries.\n` +
    `    Make sure you have manually checked that the linked libraries are upgrade safe.\n`,
  'struct-definition':
    `    You are using the \`unsafeAllow.struct-definition\` flag to skip storage checks for structs.\n` +
    `    Make sure you have manually checked the storage layout for incompatibilities.\n`,
  'enum-definition':
    `    You are using the \`unsafeAllow.enum-definition\` flag to skip storage checks for enums.\n` +
    `    Make sure you have manually checked the storage layout for incompatibilities.\n`,
  constructor: `    You are using the \`unsafeAllow.constructor\` flag.\n`,
  delegatecall: `    You are using the \`unsafeAllow.delegatecall\` flag.\n`,
  selfdestruct: `    You are using the \`unsafeAllow.selfdestruct\` flag.\n`,
};

export function withValidationDefaults(opts: ValidationOptions): Required<ValidationOptions> {
  const unsafeAllow = opts.unsafeAllow ?? [];
  const unsafeAllowCustomTypes =
    opts.unsafeAllowCustomTypes ??
    (unsafeAllow.includes('struct-definition') && unsafeAllow.includes('enum-definition'));
  const unsafeAllowLinkedLibraries =
    opts.unsafeAllowLinkedLibraries ?? unsafeAllow.includes('external-library-linking');

  if (unsafeAllowCustomTypes) {
    unsafeAllow.push('enum-definition', 'struct-definition');
  }
  if (unsafeAllowLinkedLibraries) {
    unsafeAllow.push('external-library-linking');
  }

  return { unsafeAllowCustomTypes, unsafeAllowLinkedLibraries, unsafeAllow };
}

export function processExceptions(
  contractName: string,
  errors: ValidationError[],
  opts: ValidationOptions,
): ValidationError[] {
  const { unsafeAllow } = withValidationDefaults(opts);

  for (const [errorType, errorDescription] of Object.entries(ValidationErrorUnsafeMessages)) {
    if (unsafeAllow.includes(errorType as ValidationError['kind'])) {
      let exceptionsFound = false;

      errors = errors.filter(error => {
        const isException = errorType === error.kind;
        exceptionsFound = exceptionsFound || isException;
        return !isException;
      });

      if (exceptionsFound && !silenced && errorDescription) {
        console.error(
          chalk.keyword('orange').bold('Warning: ') +
            `Potentially unsafe deployment of ${contractName}\n\n` +
            errorDescription,
        );
      }
    }
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
