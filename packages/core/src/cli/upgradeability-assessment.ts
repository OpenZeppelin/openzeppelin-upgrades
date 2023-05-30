import { getAnnotationArgs } from '../utils/annotations';
import { inferInitializable, inferUUPS } from '../validate/query';
import { SourceContract } from './validations';

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
  const referenceContract = allContracts.find(c => c.fullyQualifiedName === reference || c.name === reference);
  if (referenceContract !== undefined) {
    return referenceContract;
  } else {
    throw new Error(`Could not find contract ${reference} referenced in ${origin.fullyQualifiedName}.`);
  }
}

function getAnnotationAssessment(contract: SourceContract): AnnotationAssessment {
  const node = contract.node;

  if ('documentation' in node) {
    const doc = typeof node.documentation === 'string' ? node.documentation : node.documentation?.text ?? '';

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
    throw new Error(
      `Invalid number of arguments for @custom:${tag} annotation in contract ${contract.fullyQualifiedName}. Expected ${expectedLength}, found ${annotationArgs.length}`,
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
