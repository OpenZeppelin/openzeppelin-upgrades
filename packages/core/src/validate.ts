import fs from 'fs';
import crypto from 'crypto';
import { isNodeType, findAll } from 'solidity-ast/utils';
import type { ContractDefinition } from 'solidity-ast';
import { SolcOutput } from './solc-output';

import { getVersionId } from '.';

export type Validation = Record<string, ValidationResult>;

interface ValidationResult {
  version?: string;
  inherit: string[];
  errors: ValidationError[];
}

interface ValidationError {
  kind:
    | 'constructor'
    | 'delegatecall'
    | 'selfdestruct'
    | 'state-variable-assignment'
    | 'state-variable-immutable'
  ;
}

export function validate(solcOutput: SolcOutput): Validation {
  const validation: Validation = {};
  const fromId: Record<number, string> = {};
  const inheritIds: Record<string, number[]> = {}

  for (const source in solcOutput.contracts) {
    for (const contractName in solcOutput.contracts[source]) {
      const bytecode = solcOutput.contracts[source][contractName].evm.deployedBytecode.object;
      const version = bytecode === '' ? undefined : getVersionId(bytecode);
      validation[contractName] = { version, inherit: [], errors: [] };
    }

    for (const contractDef of findAll('ContractDefinition', solcOutput.sources[source].ast)) {
      fromId[contractDef.id] = contractDef.name;

      if (contractDef.name in validation) {
        inheritIds[contractDef.name] = contractDef.linearizedBaseContracts.slice(1);

        validation[contractDef.name].errors = [
          ...getConstructorErrors(contractDef),
          ...getDelegateCallErrors(contractDef),
          ...getStateVariableErrors(contractDef),
        ];
      }
    }
  }

  for (const contractName in inheritIds) {
    validation[contractName].inherit = inheritIds[contractName].map(id => fromId[id]);
  }

  return validation;
}

export function getErrors(validation: Validation, contractName: string) {
  const c = validation[contractName];
  if (c === undefined) {
    throw new Error(`Contract ${contractName} not found`);
  }
  return c.errors.concat(...c.inherit.map(name => validation[name].errors));
}

export function isUpgradeSafe(validation: Validation, contractName: string): boolean {
    return getErrors(validation, contractName).length == 0;
}

function* getConstructorErrors(contractDef: ContractDefinition): Generator<ValidationError> {
  for (const fnDef of findAll('FunctionDefinition', contractDef)) {
    if (fnDef.kind === 'constructor' && ((fnDef.body?.statements.length ?? 0) > 0 || fnDef.modifiers.length > 0)) {
      yield { kind: 'constructor' };
    }
  }
}

function* getDelegateCallErrors(contractDef: ContractDefinition): Generator<ValidationError> {
  for (const fnCall of findAll('FunctionCall', contractDef)) {
    const fn = fnCall.expression;
    if (fn.typeDescriptions.typeIdentifier?.match(/^t_function_baredelegatecall_/)) {
      yield { kind: 'delegatecall' };
    }
    if (fn.typeDescriptions.typeIdentifier?.match(/^t_function_selfdestruct_/)) {
      yield { kind: 'selfdestruct' };
    }
  }
}

function* getStateVariableErrors(contractDef: ContractDefinition): Generator<ValidationError> {
  for (const varDecl of contractDef.nodes) {
    if (isNodeType('VariableDeclaration', varDecl)) {
      if (!varDecl.constant && varDecl.value !== null) {
        yield { kind: 'state-variable-assignment' }
      }
      if (varDecl.mutability === 'immutable') {
        yield { kind: 'state-variable-immutable' }
      }
    }
  }
}
