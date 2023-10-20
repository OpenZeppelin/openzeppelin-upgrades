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
  readonly origin?: string;

  constructor(reference: string, origin?: string) {
    const msg =
      origin !== undefined
        ? `Could not find contract ${reference} referenced in ${origin}.`
        : `Could not find contract ${reference}.`;
    super(msg);
    this.reference = reference;
    this.origin = origin;
  }
}

export function findContract(contractName: string, origin: SourceContract | undefined, allContracts: SourceContract[]) {
  const foundContracts = allContracts.filter(c => isMatch(contractName, c));

  if (foundContracts.length > 1) {
    const msg =
      origin !== undefined
        ? `Found multiple contracts with name ${contractName} referenced in ${origin.fullyQualifiedName}.`
        : `Found multiple contracts with name ${contractName}.`;
    throw new ValidateCommandError(
      msg,
      () =>
        `This may be caused by old copies of build info files. Clean and recompile your project, then run the command again with the updated files.`,
    );
  } else if (foundContracts.length === 1) {
    return foundContracts[0];
  } else {
    throw new ReferenceContractNotFound(contractName, origin?.fullyQualifiedName);
  }
}

export function isMatch(contractName: string, contract: SourceContract) {
  return (
    contract.fullyQualifiedName === contractName || // contracts/MyContract.sol:MyContract
    contract.name === contractName || // MyContract
    matchesDotSolAndName(contractName, contract) || // MyContract.sol:MyContract
    matchesDotSol(contractName, contract) // MyContract.sol
  );
}

function matchesDotSolAndName(contractName: string, contract: SourceContract) {
  if (contractName.includes('.sol:')) {
    const [fileWithoutExtension, name] = contractName.split('.sol:');
    return matchesFullyQualifiedName(fileWithoutExtension, name, contract);
  } else {
    return false;
  }
}

function matchesDotSol(contractName: string, contract: SourceContract) {
  if (contractName.endsWith('.sol')) {
    const name = contractName.slice(0, contractName.length - 4);
    return matchesFullyQualifiedName(name, name, contract);
  } else {
    return false;
  }
}

function matchesFullyQualifiedName(fileNameWithoutExtension: string, name: string, contract: SourceContract) {
  const lastSlash = contract.fullyQualifiedName.lastIndexOf('/');
  const fullyQualifiedWithoutPath =
    lastSlash >= 0 ? contract.fullyQualifiedName.slice(lastSlash + 1) : contract.fullyQualifiedName;

  return contract.name === name && fullyQualifiedWithoutPath === `${fileNameWithoutExtension}.sol:${name}`;
}
