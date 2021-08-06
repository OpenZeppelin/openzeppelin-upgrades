import type { FunctionDefinition, VariableDeclaration } from 'solidity-ast';
import { ASTDereferencer } from '../ast-dereferencer';
import { assert, assertUnreachable } from './assert';

function serializeTypeName(parameter: VariableDeclaration, deref: ASTDereferencer): string {
  const { typeName, storageLocation } = parameter;
  assert(!!typeName);

  if (storageLocation === 'storage') {
    assert(typeof typeName.typeDescriptions.typeString === 'string');
    return typeName.typeDescriptions.typeString.replace(/^struct /, '') + ' storage';
  }

  switch (typeName.nodeType) {
    case 'ArrayTypeName':
    case 'ElementaryTypeName': {
      assert(typeof typeName.typeDescriptions.typeString === 'string');
      return typeName.typeDescriptions.typeString;
    }

    case 'UserDefinedTypeName': {
      const userDefinedType = deref(
        ['StructDefinition', 'EnumDefinition', 'ContractDefinition'],
        typeName.referencedDeclaration,
      );
      switch (userDefinedType.nodeType) {
        case 'StructDefinition':
          return '(' + userDefinedType.members.map(member => serializeTypeName(member, deref)) + ')';

        case 'EnumDefinition':
          assert(userDefinedType.members.length < 256);
          return 'uint8';

        case 'ContractDefinition':
          return 'address';

        default:
          return assertUnreachable(userDefinedType);
      }
    }

    case 'FunctionTypeName': {
      return `function`;
    }

    default:
      throw new Error(`Unsuported TypeName node type: ${typeName.nodeType}`);
  }
}

export function getFunctionSignature(fnDef: FunctionDefinition, deref: ASTDereferencer): string {
  return `${fnDef.name}(${fnDef.parameters.parameters.map(parameter => serializeTypeName(parameter, deref)).join()})`;
}
