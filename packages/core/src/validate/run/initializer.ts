import type { ContractDefinition, FunctionDefinition } from 'solidity-ast';
import { ASTDereferencer, findAll } from 'solidity-ast/utils';
import { SrcDecoder } from '../../src-decoder';
import { ValidationExceptionInitializer, skipCheck } from '../run';

/**
 * Reports if this contract is non-abstract and any of the following are true:
 * - 1. Missing initializer: This contract does not appear to have an initializer, but parent contracts require initialization.
 * - 2. Missing initializer call: This contract's initializer is missing a call to a parent initializer.
 * - 3. Duplicate initializer call: This contract has duplicate calls to the same parent initializer function.
 * - 4. Incorrect initializer order (warning): This contract does not call parent initializers in the correct order.
 */
export function* getInitializerExceptions(
  contractDef: ContractDefinition,
  deref: ASTDereferencer,
  decodeSrc: SrcDecoder,
): Generator<ValidationExceptionInitializer> {
  if (contractDef.abstract) {
    return;
  }

  const linearizedParentContracts = getLinearizedParentContracts(contractDef, deref);
  const parentNameToInitializersMap = getParentNameToInitializersMap(linearizedParentContracts);
  const { initializersCalledByParents, remainingParents } = getInitializersCalledByParents(parentNameToInitializersMap);

  if (remainingParents.length > 0) {
    const contractInitializers = getPossibleInitializers(contractDef, false);

    // Report if there is no initializer but parents need initialization
    if (
      checkNeedsInitialization(remainingParents, parentNameToInitializersMap) &&
      contractInitializers.length === 0 &&
      !skipCheck('missing-initializer', contractDef)
    ) {
      yield {
        kind: 'missing-initializer',
        src: decodeSrc(contractDef),
      };
    }

    // If this contract has initializers, they MUST call initializers from all parents which are not yet initialized
    // (regardless of whether the parent initializers are internal or public), so that the entire state is initialized in one transaction.
    const expectedLinearization = remainingParents;

    for (const contractInitializer of contractInitializers) {
      yield* getInitializerCallExceptions(
        contractInitializer,
        expectedLinearization,
        parentNameToInitializersMap,
        initializersCalledByParents,
        contractDef,
        decodeSrc,
      );
    }
  }
}

function getLinearizedParentContracts(contractDef: ContractDefinition, deref: ASTDereferencer) {
  const parents = contractDef.linearizedBaseContracts.map(base => deref('ContractDefinition', base));
  parents.reverse(); // use most derived first
  parents.pop(); // remove self
  return parents;
}

/**
 * Gets a map of parent contract names to their possible initializers.
 * If a parent contract has no initializers, it is not included in the map.
 */
function getParentNameToInitializersMap(linearizedParentContracts: ContractDefinition[]) {
  const map = new Map();
  for (const parent of linearizedParentContracts) {
    const initializers = getPossibleInitializers(parent, true);
    if (initializers.length > 0) {
      map.set(parent.name, initializers);
    }
  }
  return map;
}

/**
 * Returns true if this contract must have its own initializer to call parent initializers.
 *
 * If there are multiple parents with initializers, regardless of whether they are internal or public,
 * this contract must have its own initializer to call them so that the state is initialized in one transaction.
 *
 * Otherwise, if there is only one parent with initializers, they only need to be called if they are internal, since public initializers can be called directly.
 */

function checkNeedsInitialization(
  remainingParents: string[],
  parentNameToInitializersMap: Map<string, FunctionDefinition[]>,
) {
  if (remainingParents.length > 1) {
    return true;
  }
  const [parent] = remainingParents;
  const parentInitializers = parentNameToInitializersMap.get(parent)!;
  return parentInitializers.every(init => init.visibility === 'internal');
}

interface ParentInitializerCallResults {
  /**
   * Parent initializer ids that have already been called by other parent initializers.
   */
  initializersCalledByParents: number[];

  /**
   * Parent contracts that are not yet initialized by other parent initializers.
   */
  remainingParents: string[];
}

/**
 * Returns any parent initializers that have already been called by other parent initializers,
 * and the remaining parent contracts that are not yet initialized.
 *
 * Ignores whether the parent contracts are calling their initializers in the correct order,
 * because we only want to report the order of THIS contract's calls.
 */
function getInitializersCalledByParents(
  parentNameToInitializersMap: Map<string, FunctionDefinition[]>,
): ParentInitializerCallResults {
  const calledInitializers: number[] = [];
  const remainingParents = [...parentNameToInitializersMap.keys()];

  for (const parent of remainingParents) {
    const parentInitializers = parentNameToInitializersMap.get(parent)!;
    for (const initializer of parentInitializers) {
      const expressionStatements =
        initializer.body?.statements?.filter(stmt => stmt.nodeType === 'ExpressionStatement') ?? [];
      for (const stmt of expressionStatements) {
        const fnCall = stmt.expression;
        if (
          fnCall.nodeType === 'FunctionCall' &&
          (fnCall.expression.nodeType === 'Identifier' || fnCall.expression.nodeType === 'MemberAccess')
        ) {
          const referencedFn = fnCall.expression.referencedDeclaration;
          if (referencedFn) {
            const earlierParents = remainingParents.slice(0, remainingParents.indexOf(parent));
            const callsEarlierParentInitializer = earlierParents.find(base =>
              parentNameToInitializersMap.get(base)!.some(init => init.id === referencedFn),
            );
            if (callsEarlierParentInitializer) {
              calledInitializers.push(referencedFn);
              remainingParents.splice(remainingParents.indexOf(callsEarlierParentInitializer), 1);
            }
          }
        }
      }
    }
  }

  return {
    initializersCalledByParents: calledInitializers,
    remainingParents,
  };
}

/**
 * Reports exceptions for missing initializer calls, duplicate initializer calls, and incorrect initializer order.
 *
 * @param contractInitializer An initializer function for the current contract
 * @param expectedLinearization The expected initialization order of parent contracts
 * @param parentNameToInitializersMap Map of parent contract names to their possible initializers
 * @param initializersCalledByParents List of parent initializers that have already been called by other parents
 * @param contractDef The current contract
 * @param decodeSrc Source decoder
 */
function* getInitializerCallExceptions(
  contractInitializer: FunctionDefinition,
  expectedLinearization: string[],
  parentNameToInitializersMap: Map<string, FunctionDefinition[]>,
  initializersCalledByParents: number[],
  contractDef: ContractDefinition,
  decodeSrc: SrcDecoder,
): Generator<ValidationExceptionInitializer> {
  const remainingParents: string[] = [...expectedLinearization];
  const foundParents: string[] = [];
  const calledInitializerIds: number[] = [...initializersCalledByParents];

  const expressionStatements =
    contractInitializer.body?.statements?.filter(stmt => stmt.nodeType === 'ExpressionStatement') ?? [];
  for (const stmt of expressionStatements) {
    const fnCall = stmt.expression;
    if (
      fnCall.nodeType === 'FunctionCall' &&
      (fnCall.expression.nodeType === 'Identifier' || fnCall.expression.nodeType === 'MemberAccess')
    ) {
      const referencedFn = fnCall.expression.referencedDeclaration;

      // If this is a call to a parent initializer, then:
      // - Check if it was already called (duplicate call)
      // - Otherwise, check if the parent initializer is called in linearized order
      for (const parent of parentNameToInitializersMap.keys()) {
        const parentInitializers = parentNameToInitializersMap.get(parent)!;
        const callsParentInitializer = parentInitializers.find(init => init.id === referencedFn);
        if (referencedFn && callsParentInitializer) {
          const duplicate = calledInitializerIds.includes(referencedFn);
          if (
            duplicate &&
            !skipCheck('duplicate-initializer-call', contractDef) &&
            !skipCheck('duplicate-initializer-call', contractInitializer) &&
            !skipCheck('duplicate-initializer-call', stmt)
          ) {
            yield {
              kind: 'duplicate-initializer-call',
              src: decodeSrc(fnCall),
              parentInitializer: callsParentInitializer.name,
              parentContract: parent,
            };
          }
          calledInitializerIds.push(referencedFn);
          foundParents.push(parent);
          const index = remainingParents.indexOf(parent);
          if (
            // Omit duplicate calls to avoid treating them as out of order. Duplicates are either reported above or they were skipped.
            !duplicate &&
            index !== 0 &&
            !skipCheck('incorrect-initializer-order', contractDef) &&
            !skipCheck('incorrect-initializer-order', contractInitializer)
          ) {
            yield {
              kind: 'incorrect-initializer-order',
              src: decodeSrc(fnCall),
              expectedLinearization,
              foundOrder: foundParents,
            };
          }
          if (index !== -1) {
            remainingParents.splice(index, 1);
          }
        }
      }
    }
  }

  // Report any remaining parents that were not initialized
  if (
    remainingParents.length > 0 &&
    !skipCheck('missing-initializer-call', contractDef) &&
    !skipCheck('missing-initializer-call', contractInitializer)
  ) {
    yield {
      kind: 'missing-initializer-call',
      src: decodeSrc(contractInitializer),
      parentContracts: remainingParents,
    };
  }
}

/**
 * Get all functions that could be initializers. Does not include private functions.
 * For parent contracts, only internal and public functions which contain statements are included.
 */
function getPossibleInitializers(contractDef: ContractDefinition, isParentContract: boolean) {
  const fns = [...findAll('FunctionDefinition', contractDef)];
  return fns.filter(
    fnDef =>
      (fnDef.modifiers.some(modifier =>
        ['initializer', 'reinitializer', 'onlyInitializing'].includes(modifier.modifierName.name),
      ) ||
        ['initialize', 'initializer', 'reinitialize', 'reinitializer'].includes(fnDef.name)) &&
      // Skip virtual functions without a body, since that indicates an abstract function and is not itself an initializer
      !(fnDef.virtual && !fnDef.body) &&
      // Ignore private functions, since they cannot be called outside the contract
      fnDef.visibility !== 'private' &&
      // For parent contracts, only internal and public functions which contain statements need to be called
      (isParentContract
        ? fnDef.body?.statements?.length && (fnDef.visibility === 'internal' || fnDef.visibility === 'public')
        : true),
  );
}
