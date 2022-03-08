import assert from 'assert';
import {
  ContractDefinition,
  StructDefinition,
  EnumDefinition,
  TypeDescriptions,
  VariableDeclaration,
} from 'solidity-ast';
import { isNodeType, findAll } from 'solidity-ast/utils';
import { StorageLayout, TypeItem } from './layout';
import { normalizeTypeIdentifier } from '../utils/type-id';
import { SrcDecoder } from '../src-decoder';
import { ASTDereferencer } from '../ast-dereferencer';
import { mapValues } from '../utils/map-values';
import { pick } from '../utils/pick';

const currentLayoutVersion = '1.1';

export function isCurrentLayoutVersion(layout: StorageLayout): boolean {
  return layout?.layoutVersion === currentLayoutVersion;
}

export function extractStorageLayout(
  contractDef: ContractDefinition,
  decodeSrc: SrcDecoder,
  deref: ASTDereferencer,
  storageLayout?: StorageLayout | undefined,
): StorageLayout {
  const layout: StorageLayout = { storage: [], types: {}, layoutVersion: currentLayoutVersion, flat: false };
  if (storageLayout !== undefined) {
    layout.types = mapValues(storageLayout.types, m => {
      return {
        label: m.label,
        members: m.members?.map(m => (typeof m === 'string' ? m : pick(m, ['label', 'type']))) as TypeItem['members'],
      };
    });

    for (const storage of storageLayout.storage) {
      const origin = getOriginContract(contractDef, storage.astId, deref);
      assert(origin, `Did not find variable declaration node for '${storage.label}'`);
      const { varDecl, contract } = origin;
      // Solc layout doesn't bring members for enums so we get them using the ast method
      loadLayoutType(varDecl, layout, deref);
      const { label, offset, slot, type } = storage;
      const src = decodeSrc(varDecl);
      layout.storage.push({ label, offset, slot, type, contract, src });
      layout.flat = true;
    }
  } else {
    for (const varDecl of contractDef.nodes) {
      if (isNodeType('VariableDeclaration', varDecl)) {
        if (!varDecl.constant && varDecl.mutability !== 'immutable') {
          const type = normalizeTypeIdentifier(typeDescriptions(varDecl).typeIdentifier);

          layout.storage.push({
            contract: contractDef.name,
            label: varDecl.name,
            type,
            src: decodeSrc(varDecl),
          });

          loadLayoutType(varDecl, layout, deref);
        }
      }
    }
  }
  return layout;
}

const findTypeNames = findAll([
  'ArrayTypeName',
  'ElementaryTypeName',
  'FunctionTypeName',
  'Mapping',
  'UserDefinedTypeName',
]);

interface RequiredTypeDescriptions {
  typeIdentifier: string;
  typeString: string;
}

function typeDescriptions(x: { typeDescriptions: TypeDescriptions }): RequiredTypeDescriptions {
  assert(typeof x.typeDescriptions.typeIdentifier === 'string');
  assert(typeof x.typeDescriptions.typeString === 'string');
  return x.typeDescriptions as RequiredTypeDescriptions;
}

function getTypeMembers(typeDef: StructDefinition | EnumDefinition): TypeItem['members'] {
  if (typeDef.nodeType === 'StructDefinition') {
    return typeDef.members.map(m => {
      assert(typeof m.typeDescriptions.typeIdentifier === 'string');
      return {
        label: m.name,
        type: normalizeTypeIdentifier(m.typeDescriptions.typeIdentifier),
      };
    });
  } else {
    return typeDef.members.map(m => m.name);
  }
}

function getOriginContract(contract: ContractDefinition, astId: number | undefined, deref: ASTDereferencer) {
  for (const id of contract.linearizedBaseContracts.reverse()) {
    const parentContract = deref(['ContractDefinition'], id);

    const varDecl = parentContract.nodes.find(n => n.id == astId);
    if (varDecl && isNodeType('VariableDeclaration', varDecl)) {
      return { varDecl, contract: parentContract.name };
    }
  }
}

function loadLayoutType(varDecl: VariableDeclaration, layout: StorageLayout, deref: ASTDereferencer) {
  // Note: A UserDefinedTypeName can also refer to a ContractDefinition but we won't care about those.
  const derefUserDefinedType = deref(['StructDefinition', 'EnumDefinition']);

  assert(varDecl.typeName != null);

  // We will recursively look for all types involved in this variable declaration in order to store their type
  // information. We iterate over a Map that is indexed by typeIdentifier to ensure we visit each type only once.
  // Note that there can be recursive types.
  const typeNames = new Map([...findTypeNames(varDecl.typeName)].map(n => [typeDescriptions(n).typeIdentifier, n]));

  for (const typeName of typeNames.values()) {
    const { typeIdentifier, typeString: label } = typeDescriptions(typeName);
    const type = normalizeTypeIdentifier(typeIdentifier);
    layout.types[type] ??= { label };

    if ('referencedDeclaration' in typeName && !/^t_contract\b/.test(type)) {
      const typeDef = derefUserDefinedType(typeName.referencedDeclaration);
      layout.types[type].members ??= getTypeMembers(typeDef);

      // Recursively look for the types referenced in this definition and add them to the queue.
      for (const typeName of findTypeNames(typeDef)) {
        const { typeIdentifier } = typeDescriptions(typeName);
        if (!typeNames.has(typeIdentifier)) {
          typeNames.set(typeIdentifier, typeName);
        }
      }
    }
  }
}
