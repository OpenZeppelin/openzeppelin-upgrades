import { getAnnotationArgs, getDocumentation } from '../../utils/annotations';
import { inferInitializable, inferUUPS } from '../../validate/query';
import { ValidateCommandError } from './error';
import { SourceContract } from './validations';

export class ReferenceContractNotFound extends Error {
  /**
   * The contract reference that could not be found.
   */
  readonly reference: string;

  /**
   * The fully qualified name of the contract that referenced the missing contract.
   */
  readonly origin: string;

  constructor(reference: string, origin: string) {
    super(`Could not find contract ${reference} referenced in ${origin}.`);
    this.reference = reference;
    this.origin = origin;
  }
}

interface AnnotationAssessment {
  upgradeable: boolean;
  referenceName?: string;
}

export interface UpgradeabilityAssessment {
  upgradeable: boolean;
  referenceContract?: SourceContract;
  uups?: boolean;
}

export function getUpgradeabilityAssessment(
  contract: SourceContract,
  allContracts: SourceContract[],
): UpgradeabilityAssessment {
  const fullContractName = contract.fullyQualifiedName;
  const contractValidation = contract.validationData[fullContractName];

  const isUUPS = inferUUPS(contract.validationData, fullContractName);

  const annotationAssessment = getAnnotationAssessment(contract);
  if (annotationAssessment.upgradeable) {
    let referenceContract = undefined;
    let isReferenceUUPS = false;
    if (annotationAssessment.referenceName !== undefined) {
      referenceContract = getReferenceContract(annotationAssessment.referenceName, contract, allContracts);
      isReferenceUUPS = inferUUPS(referenceContract.validationData, referenceContract.fullyQualifiedName);
    }

    return {
      upgradeable: true,
      referenceContract: referenceContract,
      uups: isReferenceUUPS || isUUPS,
    };
  } else {
    const initializable = inferInitializable(contractValidation);
    return {
      upgradeable: initializable || isUUPS,
      uups: isUUPS,
    };
  }
}

function getReferenceContract(reference: string, origin: SourceContract, allContracts: SourceContract[]) {
  const referenceContracts = allContracts.filter(c => c.fullyQualifiedName === reference || c.name === reference);

  if (referenceContracts.length > 1) {
    throw new ValidateCommandError(
      `Found multiple contracts with name ${reference} referenced in ${origin.fullyQualifiedName}.`,
      () =>
        `This may be caused by old copies of build info files. Clean and recompile your project, then run the command again with the updated files.`,
    );
  } else if (referenceContracts.length === 1) {
    return referenceContracts[0];
  } else {
    throw new ReferenceContractNotFound(reference, origin.fullyQualifiedName);
  }
}

function getAnnotationAssessment(contract: SourceContract): AnnotationAssessment {
  const node = contract.node;

  if ('documentation' in node) {
    const doc = getDocumentation(node);

    const tag = 'oz-upgrades';
    const hasUpgradeAnnotation = hasAnnotationTag(doc, tag);
    if (hasUpgradeAnnotation) {
      getAndValidateAnnotationArgs(doc, tag, contract, 0);
    }

    const upgradesFrom = getUpgradesFrom(doc, contract);
    if (upgradesFrom !== undefined) {
      return {
        upgradeable: true,
        referenceName: upgradesFrom,
      };
    } else {
      return {
        upgradeable: hasUpgradeAnnotation,
      };
    }
  } else {
    return {
      upgradeable: false,
    };
  }
}

function getAndValidateAnnotationArgs(doc: string, tag: string, contract: SourceContract, expectedLength: number) {
  const annotationArgs = getAnnotationArgs(doc, tag, undefined);
  if (annotationArgs.length !== expectedLength) {
    throw new ValidateCommandError(
      `Invalid number of arguments for @custom:${tag} annotation in contract ${contract.fullyQualifiedName}.`,
      () => `Found ${annotationArgs.length}, expected ${expectedLength}.`,
    );
  }
  return annotationArgs;
}

function hasAnnotationTag(doc: string, tag: string): boolean {
  const regex = new RegExp(`^\\s*(@custom:${tag})(\\s|$)`, 'm');
  return regex.test(doc);
}

function getUpgradesFrom(doc: string, contract: SourceContract): string | undefined {
  const tag = 'oz-upgrades-from';
  if (hasAnnotationTag(doc, tag)) {
    const annotationArgs = getAndValidateAnnotationArgs(doc, tag, contract, 1);
    return annotationArgs[0];
  } else {
    return undefined;
  }
}
