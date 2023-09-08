import assert from 'assert';
import { ContractDefinition, StructDefinition } from 'solidity-ast';
import { isNodeType } from 'solidity-ast/utils';
import { StorageItem, StorageLayout, TypeItem } from './layout';
import { SrcDecoder } from '../src-decoder';
import { getAnnotationArgs, getDocumentation, hasAnnotationTag } from '../utils/annotations';
import { Node } from 'solidity-ast/node';
import { CompilationContext, getTypeMembers, loadLayoutType } from './extract';
import debug from '../utils/debug';

/**
 * Loads namespaces and namespaced type information into the storage layout.
 *
 * The provided compilation contexts must include both the original compilation and optionally
 * a namespaced compilation where contracts have been modified to include namespaced type information.
 *
 * If namespaced compilation is included, storage slots and offsets will be included in the loaded namespaces and types.
 *
 * This function looks up namespaces and their members from the namespaced compilation context's AST if available
 * (meaning node ids would be from the namespaced compilation), and looks up slots and offsets from the compiled type information.
 * However, it saves the original source locations from the original context so that line numbers are
 * consistent with the original source code.
 *
 * @param decodeSrc Source decoder for the original source code.
 * @param layout The storage layout object to load namespaces into.
 * @param origContext The original compilation context, which is used to lookup original source locations.
 * @param namespacedContext The namespaced compilation context, which represents a namespaced compilation.
 */
export function loadNamespaces(
  decodeSrc: SrcDecoder,
  layout: StorageLayout,
  origContext: CompilationContext,
  namespacedContext?: CompilationContext,
) {
  // TODO if there is a namespace annotation in source code, check if solidity version is >= 0.8.20

  const namespaces: Record<string, StorageItem[]> = {};
  pushDirectNamespaces(namespaces, decodeSrc, layout, namespacedContext ?? origContext, origContext.contractDef);
  pushInheritedNamespaces(namespaces, decodeSrc, layout, origContext, namespacedContext);
  layout.namespaces = namespaces;
}

function pushDirectNamespaces(
  namespaces: Record<string, StorageItem<string>[]>,
  decodeSrc: SrcDecoder,
  layout: StorageLayout,
  context: CompilationContext,
  origContractDef: ContractDefinition,
) {
  for (const node of context.contractDef.nodes) {
    if (isNodeType('StructDefinition', node)) {
      const storageLocationArg = getStorageLocationArg(node);
      if (storageLocationArg !== undefined) {
        if (namespaces[storageLocationArg] !== undefined) {
          // This is checked when running validations, so just log a debug message here
          debug(`Duplicate namespace ${storageLocationArg} in contract ${context.contractDef.name}`);
        } else {
          namespaces[storageLocationArg] = getNamespacedStorageItems(node, decodeSrc, layout, context, origContractDef);
        }
      }
    }
  }
}

function pushInheritedNamespaces(
  namespaces: Record<string, StorageItem<string>[]>,
  decodeSrc: SrcDecoder,
  layout: StorageLayout,
  origContext: CompilationContext,
  namespacedContext?: CompilationContext,
) {
  const origInheritIds = origContext.contractDef.linearizedBaseContracts.slice(1);
  if (namespacedContext === undefined) {
    for (let i = 0; i < origInheritIds.length; i++) {
      const origInherit = origContext.deref(['ContractDefinition'], origInheritIds[i]);
      pushDirectNamespaces(namespaces, decodeSrc, layout, origContext, origInherit);
    }
  } else {
    const namespacedInheritIds = namespacedContext.contractDef.linearizedBaseContracts.slice(1);
    assert(origInheritIds.length === namespacedInheritIds.length);
    for (let i = 0; i < origInheritIds.length; i++) {
      const origInherit = origContext.deref(['ContractDefinition'], origInheritIds[i]);
      const namespacedInherit = namespacedContext?.deref(['ContractDefinition'], namespacedInheritIds[i]);
      pushDirectNamespaces(
        namespaces,
        decodeSrc,
        layout,
        { ...namespacedContext, contractDef: namespacedInherit },
        origInherit,
      );
    }
  }
}

/**
 * Gets the storage location string from the `@custom:storage-location` annotation.
 *
 * For example, when using ERC-7201 (https://eips.ethereum.org/EIPS/eip-7201), the result will be `erc7201:<NAMESPACE_ID>`
 *
 * @param node The node that may have a `@custom:storage-location` annotation.
 * @returns The storage location string, or undefined if the node does not have a `@custom:storage-location` annotation.
 */
export function getStorageLocationArg(node: Node) {
  const doc = getDocumentation(node);
  if (hasAnnotationTag(doc, 'storage-location')) {
    return getStorageLocation(doc);
  }
}

function getStorageLocation(doc: string) {
  const storageLocationArgs = getAnnotationArgs(doc, 'storage-location');
  if (storageLocationArgs.length !== 1) {
    throw new Error('@custom:storage-location annotation must have exactly one argument');
  }
  const storageLocation = storageLocationArgs[0];
  return storageLocation;
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

function findTypeWithLabel(types: Record<string, TypeItem>, label: string) {
  for (const type of Object.values(types)) {
    if (type.label === label) {
      return type;
    }
  }
  return undefined;
}