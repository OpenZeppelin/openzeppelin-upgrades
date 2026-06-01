import { Expression } from 'solidity-ast';
import { calculateERC7201StorageLocation } from './erc7201';
import { normalizeUint256Literal } from './integer-literals';

/**
 * Recognizes the Solidity 0.8.35+ `erc7201(string)` comptime builtin, which evaluates the ERC-7201
 * storage location for a namespace id and can be used in a compile-time context such as a `layout at`
 * specifier (e.g. `contract C layout at erc7201("example.main")`).
 *
 * The builtin compiles to an ordinary `FunctionCall` node, so it is matched by its shape rather than
 * by a dedicated AST node type.
 *
 * @param node The expression to check.
 * @returns The namespace id passed to the builtin (without the `erc7201:` prefix), or undefined if the
 *   expression is not a call to the `erc7201` builtin with a single string literal argument.
 */
export function getErc7201BuiltinNamespaceId(node: Expression): string | undefined {
  if (node.nodeType !== 'FunctionCall' || node.kind !== 'functionCall') {
    return undefined;
  }

  const callee = node.expression;
  if (callee.nodeType !== 'Identifier' || callee.name !== 'erc7201') {
    return undefined;
  }

  // A non-negative `referencedDeclaration` points to a user-defined function named `erc7201`, not
  // the comptime builtin (which uses a negative magic id, or none).
  if (typeof callee.referencedDeclaration === 'number' && callee.referencedDeclaration >= 0) {
    return undefined;
  }

  if (node.arguments.length !== 1) {
    return undefined;
  }

  const arg = node.arguments[0];
  if (arg.nodeType !== 'Literal' || arg.kind !== 'string') {
    return undefined;
  }

  return getStringLiteralValue(arg);
}

/**
 * Resolves an expression to its base slot as a normalized uint256 hex string, for either a numeric
 * literal or an `erc7201(...)` builtin call.
 *
 * @param node The expression to resolve.
 * @returns The normalized base slot hex string, or undefined if the expression is neither a numeric
 *   literal nor a resolvable `erc7201(...)` builtin call.
 */
export function resolveBaseSlot(node: Expression): string | undefined {
  if (node.nodeType === 'Literal') {
    return normalizeUint256Literal(node.value);
  }

  const id = getErc7201BuiltinNamespaceId(node);
  if (id !== undefined) {
    // calculateERC7201StorageLocation already returns a 0x-prefixed, 64-char lowercase hex string,
    // matching the format produced by normalizeUint256Literal.
    return calculateERC7201StorageLocation(id);
  }

  return undefined;
}

function getStringLiteralValue(literal: { value?: string | null; hexValue: string }): string | undefined {
  if (literal.value !== undefined && literal.value !== null) {
    return literal.value;
  }
  // String literals that the compiler could not represent as a UTF-8 `value` are only available as hex.
  if (literal.hexValue !== undefined) {
    return Buffer.from(literal.hexValue, 'hex').toString('utf8');
  }
  return undefined;
}
