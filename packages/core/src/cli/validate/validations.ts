import { solcInputOutputDecoder, validate, SolcOutput, SolcInput, ValidationRunData } from '../..';

import debug from '../../utils/debug';

import { findAll } from 'solidity-ast/utils';
import { ContractDefinition } from 'solidity-ast';

import { getFullyQualifiedName } from '../../utils/contract-name';
import { BuildInfoFile } from './build-info-file';

export interface SourceContract {
  node: ContractDefinition;
  name: string;
  fullyQualifiedName: string;
  validationData: ValidationRunData;
}

export function validateBuildInfoContracts(buildInfoFiles: BuildInfoFile[]): SourceContract[] {
  const sourceContracts: SourceContract[] = [];
  for (const buildInfoFile of buildInfoFiles) {
    const validations = runValidations(buildInfoFile.input, buildInfoFile.output);
    addContractsFromBuildInfo(buildInfoFile, validations, sourceContracts);
  }
  return sourceContracts;
}

function runValidations(solcInput: SolcInput, solcOutput: SolcOutput) {
  const decodeSrc = solcInputOutputDecoder(solcInput, solcOutput);
  const validation = validate(solcOutput, decodeSrc);
  return validation;
}

function addContractsFromBuildInfo(
  buildInfoFile: BuildInfoFile,
  validationData: ValidationRunData,
  sourceContracts: SourceContract[],
) {
  for (const sourcePath in buildInfoFile.output.sources) {
    const ast = buildInfoFile.output.sources[sourcePath].ast;

    for (const contractDef of findAll('ContractDefinition', ast)) {
      const fullyQualifiedName = getFullyQualifiedName(sourcePath, contractDef.name);
      debug('Found: ' + fullyQualifiedName);

      sourceContracts.push({
        node: contractDef,
        name: contractDef.name,
        fullyQualifiedName,
        validationData: validationData,
      });
    }
  }
}
