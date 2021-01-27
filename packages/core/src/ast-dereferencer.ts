import { findAll } from 'solidity-ast/utils';
import type { Node, NodeType, NodeTypeMap } from 'solidity-ast/node';

import { curry2 } from './utils/curry';
import type { SolcOutput } from './solc-api';

// An ASTDereferencer is a function that looks up an AST node given its id, in all of the source files involved in a
// solc run. It will generally be used together with the AST property `referencedDeclaration` (found in Identifier,
// UserDefinedTypeName, etc.) to look up a variable definition or type definition.

export interface ASTDereferencer {
  <T extends NodeType>(nodeTypes: T[]): (id: number) => NodeTypeMap[T];
  <T extends NodeType>(nodeTypes: T[], id: number): NodeTypeMap[T];
}

export function astDereferencer(solcOutput: SolcOutput): ASTDereferencer {
  const asts = Array.from(Object.values(solcOutput.sources), s => s.ast);
  const cache = new Map<number, Node>();

  function deref<T extends NodeType>(nodeTypes: T[], id: number): NodeTypeMap[T] {
    const cached = cache.get(id);

    if (cached) {
      if ((nodeTypes as NodeType[]).includes(cached.nodeType)) {
        return cached as NodeTypeMap[T];
      }
    }

    for (const ast of asts) {
      for (const node of findAll(nodeTypes, ast)) {
        if (node.id === id) {
          cache.set(id, node);
          return node;
        }
      }
    }

    throw new Error(`No node with id ${id} of type ${nodeTypes}`);
  }

  return curry2(deref);
}
