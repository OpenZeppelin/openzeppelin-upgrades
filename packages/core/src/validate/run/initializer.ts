import type { ContractDefinition, FunctionDefinition } from 'solidity-ast';
import type { Node } from 'solidity-ast/node';
import { ASTDereferencer, findAll } from 'solidity-ast/utils';
import { SrcDecoder } from '../../src-decoder';
import { ValidationExceptionInitializer, skipCheck, tryDerefFunction } from '../run';
import { getAnnotationArgs, getDocumentation, hasAnnotationTag } from '../../utils/annotations';
import { logNote } from '../../utils/log';

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
  const parentNameToInitializersMap = getParentNameToInitializersMap(linearizedParentContracts, decodeSrc);

  const remainingParents = getParentsNotInitializedByOtherParents(parentNameToInitializersMap);

  if (remainingParents.length > 0) {
    const contractInitializers = getPossibleInitializers(contractDef, false, decodeSrc);

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

    // Linearized list of parent contracts that have initializers
    const expectedLinearized: string[] = [...parentNameToInitializersMap.keys()];

    // The parent contracts that need to be directly initialized by this contract, which excludes parents that are initialized by other parents.
    // Calling these will initialize all parent contracts so that the entire state is initialized in one transaction.
    const expectedDirectCalls = remainingParents;

    for (const contractInitializer of contractInitializers) {
      yield* getInitializerCallExceptions(
        contractInitializer,
        expectedLinearized,
        expectedDirectCalls,
        parentNameToInitializersMap,
        contractDef,
        deref,
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
function getParentNameToInitializersMap(linearizedParentContracts: ContractDefinition[], decodeSrc: SrcDecoder) {
  const map = new Map();
  for (const parent of linearizedParentContracts) {
    const initializers = getPossibleInitializers(parent, true, decodeSrc);
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

/**
 * Returns parent contract names that are not initialized by other parent contracts,
 * keeping the same order as they appear in the original linearization.
 */
function getParentsNotInitializedByOtherParents(
  parentNameToInitializersMap: Map<string, FunctionDefinition[]>,
): string[] {
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
          if (referencedFn && referencedFn > 0) {
            const earlierParents = remainingParents.slice(0, remainingParents.indexOf(parent));
            const callsEarlierParentInitializer = earlierParents.find(base =>
              parentNameToInitializersMap.get(base)!.some(init => init.id === referencedFn),
            );
            if (callsEarlierParentInitializer) {
              remainingParents.splice(remainingParents.indexOf(callsEarlierParentInitializer), 1);
            }
          }
        }
      }
    }
  }

  return remainingParents;
}

/**
 * Calls the callback if the referenced function definition is found in the AST.
 * Otherwise, does nothing.
 *
 * @param deref AST dereferencer
 * @param referencedDeclaration ID of the referenced function
 * @param callback Function to call if the referenced function definition is found
 */
function doIfReferencedFunctionFound(
  deref: ASTDereferencer,
  referencedDeclaration: number | null | undefined,
  callback: (functionDef: FunctionDefinition) => void,
) {
  if (referencedDeclaration && referencedDeclaration > 0) {
    const functionDef = tryDerefFunction(deref, referencedDeclaration);
    if (functionDef !== undefined) {
      callback(functionDef);
    }
  }
}

/**
 * Reports exceptions for missing initializer calls, duplicate initializer calls, and incorrect initializer order.
 *
 * @param contractInitializer An initializer function for the current contract
 * @param expectedLinearized Linearized list of parent contracts that have initializers
 * @param expectedDirectCalls The parent contracts that need to be directly initialized by this contract
 * @param parentNameToInitializersMap Map of parent contract names to their possible initializers
 * @param initializersCalledByParents List of parent initializers that have already been called by other parents
 * @param contractDef The current contract
 * @param deref AST dereferencer
 * @param decodeSrc Source decoder
 */
function* getInitializerCallExceptions(
  contractInitializer: FunctionDefinition,
  expectedLinearized: string[],
  expectedDirectCalls: string[],
  parentNameToInitializersMap: Map<string, FunctionDefinition[]>,
  contractDef: ContractDefinition,
  deref: ASTDereferencer,
  decodeSrc: SrcDecoder,
): Generator<ValidationExceptionInitializer> {
  const foundParents: string[] = [];
  const remainingLinearized: string[] = [...expectedLinearized];
  const remainingDirectCalls: string[] = [...expectedDirectCalls];
  const calledInitializerIds: number[] = [];

  const expressionStatements =
    contractInitializer.body?.statements?.filter(stmt => stmt.nodeType === 'ExpressionStatement') ?? [];
  for (const stmt of expressionStatements) {
    const fnCall = stmt.expression;
    if (
      fnCall.nodeType === 'FunctionCall' &&
      (fnCall.expression.nodeType === 'Identifier' || fnCall.expression.nodeType === 'MemberAccess')
    ) {
      let recursiveFunctionIds: number[] = [];
      doIfReferencedFunctionFound(deref, fnCall.expression.referencedDeclaration, (functionDef: FunctionDefinition) => {
        recursiveFunctionIds = getRecursiveFunctionIds(deref, functionDef);
      });

      // For each recursively called function, if it is a parent initializer, then:
      // - Check if it was already called (duplicate call)
      // - Otherwise, check if the parent initializer is called in linearized order
      for (const calledFn of recursiveFunctionIds) {
        for (const parent of parentNameToInitializersMap.keys()) {
          const parentInitializers = parentNameToInitializersMap.get(parent)!;
          const callsParentInitializer = parentInitializers.find(init => init.id === calledFn);

          if (calledFn && callsParentInitializer) {
            const duplicate = calledInitializerIds.includes(calledFn);
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
            calledInitializerIds.push(calledFn);

            // Omit multiple initializer calls of the same parent via different functions e.g. `__X_init` which calls `__X_init_unchained`
            if (!foundParents.includes(parent)) {
              foundParents.push(parent);

              const indexLinearized = remainingLinearized.indexOf(parent);
              if (
                // Omit duplicate calls to avoid treating them as out of order. Duplicates are either reported above or they were skipped.
                !duplicate &&
                // If the parent is not the next expected linearized parent, report it as out of order
                indexLinearized !== 0 &&
                !skipCheck('incorrect-initializer-order', contractDef) &&
                !skipCheck('incorrect-initializer-order', contractInitializer)
              ) {
                yield {
                  kind: 'incorrect-initializer-order',
                  src: decodeSrc(fnCall),
                  expectedLinearization: expectedDirectCalls,
                  foundOrder: foundParents,
                };
              }
              if (indexLinearized !== -1) {
                remainingLinearized.splice(indexLinearized, 1);
              }

              const indexDirect = remainingDirectCalls.indexOf(parent);
              if (indexDirect !== -1) {
                remainingDirectCalls.splice(indexDirect, 1);
              }
            }
          }
        }
      }
    }
  }

  // Report any remaining parents that were not directly initialized,
  // unless this initializer is named `*_unchained` since by design it doesn't need to call parent initializers
  const unchained = contractInitializer.name.endsWith('_unchained');
  if (
    !unchained &&
    remainingDirectCalls.length > 0 &&
    !skipCheck('missing-initializer-call', contractDef) &&
    !skipCheck('missing-initializer-call', contractInitializer)
  ) {
    yield {
      kind: 'missing-initializer-call',
      src: decodeSrc(contractInitializer),
      parentContracts: remainingDirectCalls,
    };
  }
}

/**
 * Gets the IDs of all functions that are recursively called by the given function, including the given function itself at the end of the list.
 *
 * @param deref AST dereferencer
 * @param functionDef The node of the function definition to start from
 * @param visited Set of function IDs that have already been visited
 * @returns The IDs of all functions that are recursively called by the given function, including the given function itself at the end of the list.
 */
function getRecursiveFunctionIds(
  deref: ASTDereferencer,
  functionDef: FunctionDefinition,
  visited?: Set<number>,
): number[] {
  const result: number[] = [];

  if (visited === undefined) {
    visited = new Set();
  }
  if (visited.has(functionDef.id)) {
    return result;
  } else {
    visited.add(functionDef.id);
  }

  const expressionStatements =
    functionDef.body?.statements?.filter(stmt => stmt.nodeType === 'ExpressionStatement') ?? [];
  for (const stmt of expressionStatements) {
    const fnCall = stmt.expression;
    if (
      fnCall.nodeType === 'FunctionCall' &&
      (fnCall.expression.nodeType === 'Identifier' || fnCall.expression.nodeType === 'MemberAccess')
    ) {
      doIfReferencedFunctionFound(deref, fnCall.expression.referencedDeclaration, (functionDef: FunctionDefinition) => {
        result.push(...getRecursiveFunctionIds(deref, functionDef, visited));
      });
    }
  }
  result.push(functionDef.id);

  return result;
}

/**
 * Get all functions that are annotated as initializers or are inferred to be initializers.
 * Logs a note if any reinitializer is found.
 */
function getPossibleInitializers(
  contractDef: ContractDefinition,
  isParentContract: boolean,
  decodeSrc: SrcDecoder,
): FunctionDefinition[] {
  const fns = [...findAll('FunctionDefinition', contractDef)];
  return fns.filter((fnDef: FunctionDefinition) => {
    const validateAsInitializer = hasValidateAsInitializerAnnotation(fnDef, decodeSrc);
    if (!validateAsInitializer && fnDef.modifiers.some(modifier => 'reinitializer' === modifier.modifierName.name)) {
      logNote(`Reinitializers are not included in validations by default`, [
        `${decodeSrc(fnDef)}: If you want to validate this function as an initializer, annotate it with '@custom:oz-upgrades-validate-as-initializer'`,
      ]);
    }

    return inferPossibleInitializer(fnDef, validateAsInitializer, isParentContract);
  });
}

function hasValidateAsInitializerAnnotation(node: Node, decodeSrc: SrcDecoder): boolean {
  const doc = getDocumentation(node);
  const tag = 'oz-upgrades-validate-as-initializer';
  const validateAsInitializer = hasAnnotationTag(doc, tag);
  if (validateAsInitializer) {
    const annotationArgs = getAnnotationArgs(doc, tag);
    if (annotationArgs.length !== 0) {
      throw new Error(`${decodeSrc(node)}: @custom:${tag} annotation must not have any arguments`);
    }
  }
  return validateAsInitializer;
}

function hasInitializerNameOrModifier(fnDef: FunctionDefinition) {
  return (
    fnDef.modifiers.some(modifier => ['initializer', 'onlyInitializing'].includes(modifier.modifierName.name)) ||
    ['initialize', 'initializer'].includes(fnDef.name)
  );
}

/**
 * Infers whether a function could be an initializer. Does not include private functions.
 * For parent contracts, only internal and public functions which contain statements are included.
 */
function inferPossibleInitializer(
  fnDef: FunctionDefinition,
  validateAsInitializer: boolean,
  isParentContract: boolean,
): boolean {
  return (
    (validateAsInitializer || hasInitializerNameOrModifier(fnDef)) &&
    // Skip virtual functions without a body, since that indicates an abstract function and is not itself an initializer
    !(fnDef.virtual && !fnDef.body) &&
    // Ignore private functions, since they cannot be called outside the contract
    fnDef.visibility !== 'private' &&
    // For parent contracts, only internal and public functions which contain statements need to be called
    (isParentContract
      ? Boolean(fnDef.body?.statements?.length) && (fnDef.visibility === 'internal' || fnDef.visibility === 'public')
      : true)
  );
}
