import { TerminalKind } from '@nomicfoundation/slang/kinds';
import { Node, TerminalNode } from '@nomicfoundation/slang/cst';

/**
 * Returns true if the node is a trivia terminal (whitespace or comment or NatSpec)
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
