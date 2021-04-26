import type { FunctionDefinition, TypeName } from 'solidity-ast';
import { ASTDereferencer } from '../ast-dereferencer';
import { assert } from './assert';

function serializeTypeName(typename: TypeName | null | undefined, deref: ASTDereferencer): string {
  assert(!!typename);

  switch (typename.nodeType) {
    case 'ArrayTypeName':
    case 'ElementaryTypeName': {
      assert(typeof typename.typeDescriptions.typeString === 'string');
      return typename.typeDescriptions.typeString;
    }

    case 'UserDefinedTypeName': {
      const userDefinedType = deref(['StructDefinition', 'EnumDefinition'], typename.referencedDeclaration);
      switch (userDefinedType.nodeType) {
        case 'StructDefinition':
          return '(' + userDefinedType.members.map(member => serializeTypeName(member.typeName, deref)) + ')';

        case 'EnumDefinition':
          assert(userDefinedType.members.length < 256);
          return 'uint8';
      }
    }

    // eslint-disable-next-line no-fallthrough
    default:
      throw new Error(`Unsuported TypeName node type: ${typename.nodeType}`);
  }
}

export function getFunctionSignature(fnDef: FunctionDefinition, deref: ASTDereferencer): string {
  return `${fnDef.name}(${fnDef.parameters.parameters
    .map(parameter => serializeTypeName(parameter.typeName, deref))
    .join()})`;
}
