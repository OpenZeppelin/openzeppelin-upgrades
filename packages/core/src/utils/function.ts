import assert from 'assert';
import type { FunctionDefinition, TypeName } from 'solidity-ast';
import { ASTDereferencer } from '../ast-dereferencer';

function serialize(typename: TypeName | null | undefined, deref: ASTDereferencer): string {
  assert(!!typename);
  switch (typename.nodeType) {
    case 'ArrayTypeName':
      return serialize(typename.baseType, deref) + '[]';

    case 'ElementaryTypeName':
      assert(typeof typename.typeDescriptions.typeString === 'string');
      return typename.typeDescriptions.typeString;

    case 'FunctionTypeName':
      throw new Error(`Unsuported TypeName node type: ${typename.nodeType}`);

    case 'Mapping':
      throw new Error(`Unsuported TypeName node type: ${typename.nodeType}`);

    case 'UserDefinedTypeName': {
      const userDefinedType = deref(['StructDefinition', 'EnumDefinition'], typename.referencedDeclaration);
      switch (userDefinedType.nodeType) {
        case 'StructDefinition':
          return '(' + userDefinedType.members.map(member => serialize(member.typeName, deref)) + ')';

        case 'EnumDefinition':
          return 'uint8';
      }
    }
  }
}

export function getFunctionSignature(fnDef: FunctionDefinition, deref: ASTDereferencer): string | undefined {
  switch (fnDef.visibility) {
    case 'external':
    case 'public':
      return (
        fnDef.name +
        '(' +
        fnDef.parameters.parameters.map(parameter => serialize(parameter.typeName, deref)).join() +
        ')'
      );
    case 'internal':
    case 'private':
      return undefined;
  }
}
