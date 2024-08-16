import { ValidateCommandError } from './error';
import { BuildInfoDictionary } from './validate-upgrade-safety';
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

  /**
   * Reference build info directories that were also searched, if any.
   */
  readonly referenceBuildInfoDirs?: string[];

  constructor(reference: string, origin?: string, referenceBuildInfoDirs?: string[]) {
    const msg =
      origin !== undefined
        ? `Could not find contract ${reference} referenced in ${origin}.`
        : `Could not find contract ${reference}.`;
    super(msg);
    this.reference = reference;
    this.origin = origin;
    this.referenceBuildInfoDirs = referenceBuildInfoDirs;
  }
}

export function findContract(
  contractName: string,
  origin: SourceContract | undefined,
  buildInfoDictionary: BuildInfoDictionary,
  searchMainBuildInfoDirOnly = false,
) {
  const foundContracts: SourceContract[] = [];
  if (searchMainBuildInfoDirOnly) {
    foundContracts.push(...buildInfoDictionary[''].filter(c => isMatchFound(contractName, c, '')));
  } else {
    for (const [dir, contracts] of Object.entries(buildInfoDictionary)) {
      foundContracts.push(...contracts.filter(c => isMatchFound(contractName, c, dir)));
    }
  }

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
    throw new ReferenceContractNotFound(contractName, origin?.fullyQualifiedName, Object.keys(buildInfoDictionary));
  }
}

function isMatchFound(contractName: string, foundContract: SourceContract, buildInfoDirShortName: string): boolean {
  const searchPrefix = buildInfoDirShortName === '' ? '' : `${buildInfoDirShortName}:`;
  return (
    `${searchPrefix}${foundContract.fullyQualifiedName}` === contractName ||
    `${searchPrefix}${foundContract.name}` === contractName
  );
}
