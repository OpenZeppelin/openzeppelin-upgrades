import { TerminalKind } from '@nomicfoundation/slang/kinds';
import { Node, TerminalNode } from '@nomicfoundation/slang/cst';

/**
 * Returns true if the node is a trivia terminal (whitespace or comment or NatSpec)
 *
 * CAUTION: This must be imported dynamically.
 * Only import this file if Slang is supported on the current platform, otherwise an error will be thrown on import.
 */
export function isTrivia(node: Node) {
  return node instanceof TerminalNode && isTriviaKind(node.kind);
}

function isTriviaKind(kind: TerminalKind) {
  return (
    kind === TerminalKind.EndOfLine ||
    kind === TerminalKind.MultiLineComment ||
    kind === TerminalKind.MultiLineNatSpecComment ||
    kind === TerminalKind.SingleLineComment ||
    kind === TerminalKind.SingleLineNatSpecComment ||
    kind === TerminalKind.Whitespace
  );
}
