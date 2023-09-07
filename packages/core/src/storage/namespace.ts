import assert from 'assert';
import { ContractDefinition, StructDefinition } from 'solidity-ast';
import { isNodeType } from 'solidity-ast/utils';
import { StorageItem, StorageLayout, TypeItem } from './layout';
import { SrcDecoder } from '../src-decoder';
import { getAnnotationArgs, getDocumentation, hasAnnotationTag } from '../utils/annotations';
import { Node } from 'solidity-ast/node';
import { CompilationContext, getTypeMembers, loadLayoutType } from './extract';

export function loadNamespaces(
  decodeSrc: SrcDecoder,
  layout: StorageLayout,
  context: CompilationContext,
  origContractDef: ContractDefinition,
) {
  // TODO if there is a namespace annotation in source code, check if solidity version is >= 0.8.20

  const namespaces: Record<string, StorageItem[]> = {};
  for (const node of context.contractDef.nodes) {
    if (isNodeType('StructDefinition', node)) {
      const storageLocation = getNamespacedStorageLocation(node);
      if (storageLocation !== undefined) {
        namespaces[storageLocation] = getNamespacedStorageItems(node, decodeSrc, layout, context, origContractDef);
      }
    }
  }
  layout.namespaces = namespaces;
}

export function getNamespacedStorageLocation(node: Node) {
  const doc = getDocumentation(node);
  if (hasAnnotationTag(doc, 'storage-location')) {
    return getStorageLocation(doc);
  }
}

function getNamespacedStorageItems(
  node: StructDefinition,
  decodeSrc: SrcDecoder,
  layout: StorageLayout,
  context: CompilationContext,
  origContractDef: ContractDefinition,
) {
  const typeMembers = getTypeMembers(node, { typeName: true });
  assert(typeMembers !== undefined);

  const storageItems: StorageItem[] = [];
  for (const member of typeMembers) {
    if (typeof member !== 'string') {
      const contract = context.contractDef.name;
      const label = member.label;
      const type = member.type;

      const originalSrc = getOriginalSrc(node.canonicalName, member.label, origContractDef);
      if (originalSrc === undefined) {
        throw new Error(
          `Could not find original source location for namespace struct with name ${node.canonicalName} and member ${member.label}`,
        );
      }

      const src = decodeSrc({ src: originalSrc });

      const structMemberFromTypes = getStructMemberFromLayoutTypes(
        { ...context.storageLayout?.types },
        node.canonicalName,
        member.label,
      );

      let item: StorageItem = {
        contract,
        label,
        type,
        src,
      };
      if (structMemberFromTypes?.offset !== undefined && structMemberFromTypes?.slot !== undefined) {
        item = {
          ...item,
          offset: structMemberFromTypes.offset,
          slot: structMemberFromTypes.slot,
        };
      }
      storageItems.push(item);

      loadLayoutType(member.typeName, layout, context.deref);
    }
  }
  return storageItems;
}

/**
 * Lookup the original source location of a struct member.
 */
function getOriginalSrc(canonicalName: string, memberLabel: string, origContractDef: ContractDefinition) {
  for (const node of origContractDef.nodes) {
    if (isNodeType('StructDefinition', node)) {
      if (node.canonicalName === canonicalName) {
        const typeMembers = getTypeMembers(node, { src: true });
        assert(typeMembers !== undefined);

        for (const member of typeMembers) {
          if (typeof member !== 'string') {
            if (member.label === memberLabel) {
              return member.src;
            }
          }
        }
      }
    }
  }
}

function getStructMemberFromLayoutTypes(
  namespaceTypes: Record<string, TypeItem<string>>,
  structName: string,
  memberLabel: string,
) {
  const structType = findTypeWithLabel(namespaceTypes, `struct ${structName}`);
  const structMembers = structType?.members;
  if (structMembers !== undefined) {
    for (const structMember of structMembers) {
      assert(typeof structMember !== 'string');
      if (structMember.label === memberLabel) {
        return structMember;
      }
    }
  }
  return undefined;
}

function getStorageLocation(doc: string) {
  const storageLocationArgs = getAnnotationArgs(doc, 'storage-location');
  if (storageLocationArgs.length !== 1) {
    throw new Error('@custom:storage-location annotation must have exactly one argument');
  }
  const storageLocation = storageLocationArgs[0];
  return storageLocation;
}

function findTypeWithLabel(types: Record<string, TypeItem>, label: string) {
  for (const type of Object.values(types)) {
    if (type.label === label) {
      return type;
    }
  }
  return undefined;
}
