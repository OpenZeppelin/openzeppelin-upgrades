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
  // Check that this is a function call to an identifier named `erc7201`. Return undefined for
  // anything else so the caller can fall through to other base-slot forms.
  if (node.nodeType !== 'FunctionCall' || node.kind !== 'functionCall') {
    return undefined;
  }
  const callee = node.expression;
  if (callee.nodeType !== 'Identifier' || callee.name !== 'erc7201') {
    return undefined;
  }

  // Beyond this point, the call is to `erc7201(...)`. Check its expected shape — one string-literal
  // argument with no user-defined declaration shadowing the builtin — and throw if anything is off.
  // Valid Solidity 0.8.35+ cannot produce these mismatches inside a `layout at` expression:
  //   - User-defined `erc7201` (`referencedDeclaration >= 0`): `layout at` requires a comptime-constant
  //     expression, which user-defined function calls aren't, so solc rejects the contract first.
  //   - Wrong number of arguments: enforced by the builtin's signature.
  //   - Non-`Literal` argument: `layout at` requires comptime-constant, and the only comptime-constant
  //     string the builtin accepts is a literal.
  //   - Non-string literal `kind` (e.g. `hex"..."`, which is type `bytes`): wouldn't typecheck against
  //     the `erc7201(string)` signature.
  // We throw instead of returning undefined so a future solc emitting one of these surfaces loudly.
  if (typeof callee.referencedDeclaration === 'number' && callee.referencedDeclaration >= 0) {
    throw new UnexpectedErc7201BuiltinAstError('callee resolves to a user-defined declaration');
  }
  if (node.arguments.length !== 1) {
    throw new UnexpectedErc7201BuiltinAstError(`expected 1 argument, got ${node.arguments.length}`);
  }
  const arg = node.arguments[0];
  if (arg.nodeType !== 'Literal') {
    throw new UnexpectedErc7201BuiltinAstError(`argument is ${arg.nodeType}, expected Literal`);
  }
  if (arg.kind !== 'string' && arg.kind !== 'unicodeString') {
    throw new UnexpectedErc7201BuiltinAstError(`argument literal kind is ${arg.kind}, expected string or unicodeString`);
  }

  return getStringLiteralValue(arg);
}

class UnexpectedErc7201BuiltinAstError extends Error {
  constructor(detail: string) {
    super(
      `Unexpected AST for \`erc7201(...)\` builtin call: ${detail}. ` +
        'Please report this at https://zpl.in/upgrades/report.',
    );
  }
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
    return calculateERC7201StorageLocation(id);
  }

  return undefined;
}

function getStringLiteralValue(literal: { value?: string | null }): string {
  // solc populates `value` for `kind: 'string'`/`'unicodeString'` literals; throw defensively if
  // a future solc ever produces a null/missing `value` for such a literal.
  if (literal.value === undefined || literal.value === null) {
    throw new UnexpectedErc7201BuiltinAstError('string literal `value` is null or missing');
  }
  return literal.value;
}
