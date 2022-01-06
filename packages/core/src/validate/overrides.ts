import { ValidationError } from './run';
import { ProxyDeployment } from '../manifest';
import { logWarning } from '../utils/log';

// Backwards compatibility
export { silenceWarnings } from '../utils/log';

export interface ValidationOptions {
  unsafeAllowCustomTypes?: boolean;
  unsafeAllowLinkedLibraries?: boolean;
  unsafeAllowRenames?: boolean;
  unsafeAllow?: ValidationError['kind'][];
  kind?: ProxyDeployment['kind'];
}

export const ValidationErrorUnsafeMessages: Record<ValidationError['kind'], string[]> = {
  'state-variable-assignment': [
    `You are using the \`unsafeAllow.state-variable-assignment\` flag.`,
    `The value will be stored in the implementation and not the proxy.`,
  ],
  'state-variable-immutable': [`You are using the \`unsafeAllow.state-variable-immutable\` flag.`],
  'external-library-linking': [
    `You are using the \`unsafeAllow.external-library-linking\` flag to include external libraries.`,
    `Make sure you have manually checked that the linked libraries are upgrade safe.`,
  ],
  'struct-definition': [
    `You are using the \`unsafeAllow.struct-definition\` flag to skip storage checks for structs.`,
    `Make sure you have manually checked the storage layout for incompatibilities.`,
  ],
  'enum-definition': [
    `You are using the \`unsafeAllow.enum-definition\` flag to skip storage checks for enums.`,
    `Make sure you have manually checked the storage layout for incompatibilities.`,
  ],
  constructor: [`You are using the \`unsafeAllow.constructor\` flag.`],
  delegatecall: [`You are using the \`unsafeAllow.delegatecall\` flag.`],
  selfdestruct: [`You are using the \`unsafeAllow.selfdestruct\` flag.`],
  'missing-public-upgradeto': [
    `You are using the \`unsafeAllow.missing-public-upgradeto\` flag with uups proxy.`,
    `Not having a public upgradeTo function in your implementation can break upgradeability.`,
    `Some implementation might check that onchain, and cause the upgrade to revert.`,
  ],
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
  const kind = opts.kind ?? 'transparent';

  const unsafeAllowRenames = opts.unsafeAllowRenames ?? false;

  return { unsafeAllowCustomTypes, unsafeAllowLinkedLibraries, unsafeAllowRenames, unsafeAllow, kind };
}

export function processExceptions(
  contractName: string,
  errors: ValidationError[],
  opts: ValidationOptions,
): ValidationError[] {
  const { unsafeAllow } = withValidationDefaults(opts);

  if (opts.kind === 'transparent') {
    errors = errors.filter(error => error.kind !== 'missing-public-upgradeto');
  }

  for (const [errorType, errorDescription] of Object.entries(ValidationErrorUnsafeMessages)) {
    if (unsafeAllow.includes(errorType as ValidationError['kind'])) {
      let exceptionsFound = false;

      errors = errors.filter(error => {
        const isException = errorType === error.kind;
        exceptionsFound = exceptionsFound || isException;
        return !isException;
      });

      if (exceptionsFound && errorDescription) {
        logWarning(`Potentially unsafe deployment of ${contractName}`, errorDescription);
      }
    }
  }

  return errors;
}
