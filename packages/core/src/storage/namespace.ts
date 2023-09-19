import assert from 'assert';
import { ContractDefinition, StructDefinition } from 'solidity-ast';
import { findAll, isNodeType } from 'solidity-ast/utils';
import { StorageItem, StorageLayout, TypeItem } from './layout';
import { SrcDecoder } from '../src-decoder';
import { getAnnotationArgs, getDocumentation, hasAnnotationTag } from '../utils/annotations';
import { Node } from 'solidity-ast/node';
import { CompilationContext, getTypeMembers, loadLayoutType } from './extract';
import { UpgradesError } from '../error';
import { SolcInput, SolcOutput } from '../solc-api';

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
  const namespacesWithSrcs = loadNamespacesWithSrcs(decodeSrc, layout, origContext, namespacedContext);
  checkAndSaveLayout(namespacesWithSrcs, origContext.contractDef, layout);
}

class DuplicateNamespaceError extends UpgradesError {
  constructor(id: string, contractName: string, srcs: string[]) {
    super(
      `Namespace ${id} is defined multiple times for contract ${contractName}`,
      () => `\
The namespace ${id} was found in structs at the following locations:
- ${srcs.join('\n- ')}

Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts.`,
    );
  }
}

/**
 * Namespaced storage items, along with the original source locations of the namespace structs
 * including where the namespace is defined in multiple places.
 */
interface NamespaceWithSrcs {
  namespace: StorageItem<string>[];
  srcs: string[];
}

/**
 * Check for duplicate namespaces and throw an error if any are found, otherwise add them to the layout
 * (without the source locations of the namespace structs since they are no longer needed).
 */
function checkAndSaveLayout(
  namespacesWithSrcs: Record<string, NamespaceWithSrcs>,
  origContract: ContractDefinition,
  layout: StorageLayout,
) {
  const namespaces: Record<string, StorageItem<string>[]> = {};
  for (const [id, namespaceWithSrcs] of Object.entries(namespacesWithSrcs)) {
    const { namespace, srcs } = namespaceWithSrcs;
    if (srcs.length > 1) {
      const contractName = origContract.canonicalName ?? origContract.name;
      throw new DuplicateNamespaceError(id, contractName, srcs);
    } else {
      // The src locations of the namespace structs are no longer needed at this point, so remove them
      namespaces[id] = namespace;
    }
  }
  layout.namespaces = namespaces;
}

/**
 * Load namespaces (including loading recursive type information) and original source locations.
 */
function loadNamespacesWithSrcs(
  decodeSrc: SrcDecoder,
  layout: StorageLayout,
  origContext: CompilationContext,
  namespacedContext?: CompilationContext,
) {
  const result: Record<string, NamespaceWithSrcs> = {};

  const origLinearizedIds = origContext.contractDef.linearizedBaseContracts;
  if (namespacedContext === undefined) {
    for (let i = 0; i < origLinearizedIds.length; i++) {
      const origReferencedContract = getReferencedContract(origContext, origLinearizedIds[i]);

      const context = { ...origContext, contractDef: origReferencedContract };
      addContractNamespacesWithSrcs(result, decodeSrc, layout, context, origReferencedContract);
    }
  } else {
    const namespacedLinearizedIds = namespacedContext.contractDef.linearizedBaseContracts;
    assert(origLinearizedIds.length === namespacedLinearizedIds.length);
    for (let i = 0; i < origLinearizedIds.length; i++) {
      const origReferencedContract = getReferencedContract(origContext, origLinearizedIds[i]);
      const namespacedReferencedContract = getReferencedContract(namespacedContext, namespacedLinearizedIds[i]);

      const context = { ...namespacedContext, contractDef: namespacedReferencedContract };
      addContractNamespacesWithSrcs(result, decodeSrc, layout, context, origReferencedContract);
    }
  }

  return result;
}

/**
 * Gets the contract definition for the given referenced id.
 */
function getReferencedContract(context: CompilationContext, referencedId: number) {
  // Optimization to avoid dereferencing if the referenced id is the same as the current contract
  return context.contractDef.id === referencedId
    ? context.contractDef
    : context.deref(['ContractDefinition'], referencedId);
}

/**
 * Add namespaces and source locations for the given compilation context's contract.
 * Does not include inherited contracts.
 */
function addContractNamespacesWithSrcs(
  namespaces: Record<string, NamespaceWithSrcs>,
  decodeSrc: SrcDecoder,
  layout: StorageLayout,
  context: CompilationContext,
  origContractDef: ContractDefinition,
) {
  for (const node of context.contractDef.nodes) {
    if (isNodeType('StructDefinition', node)) {
      const storageLocationArg = getStorageLocationArg(node);
      if (storageLocationArg !== undefined) {
        const origSrc = decodeSrc(getOriginalStruct(node.canonicalName, origContractDef));

        if (namespaces[storageLocationArg] !== undefined) {
          namespaces[storageLocationArg].srcs.push(origSrc);
        } else {
          namespaces[storageLocationArg] = {
            namespace: getNamespacedStorageItems(node, decodeSrc, layout, context, origContractDef),
            srcs: [origSrc],
          };
        }
      }
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

/**
 * Gets the storage items for the given struct node.
 * Includes loading recursive type information, and adds slot and offset if they are available in the given compilation context's layout.
 */
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

      const originalSrc = getOriginalMemberSrc(node.canonicalName, member.label, origContractDef);
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
 * Gets the struct definition matching the given canonical name from the original contract definition.
 */
function getOriginalStruct(structCanonicalName: string, origContractDef: ContractDefinition) {
  for (const node of origContractDef.nodes) {
    if (isNodeType('StructDefinition', node)) {
      if (node.canonicalName === structCanonicalName) {
        return node;
      }
    }
  }
  throw new Error(
    `Could not find original source location for namespace struct with name ${structCanonicalName} from contract ${origContractDef.name}`,
  );
}

/**
 * Gets the original source location for the given struct canonical name and struct member label.
 */
function getOriginalMemberSrc(structCanonicalName: string, memberLabel: string, origContractDef: ContractDefinition) {
  const node = getOriginalStruct(structCanonicalName, origContractDef);
  if (node !== undefined) {
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

/**
 * From the given layout types, gets the struct member matching the given struct canonical name and struct member label.
 */
function getStructMemberFromLayoutTypes(
  types: Record<string, TypeItem<string>>,
  structCanonicalName: string,
  memberLabel: string,
) {
  const structType = findTypeWithLabel(types, `struct ${structCanonicalName}`);
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

/**
 * From the given layout types, gets the type matching the given type label.
 */
function findTypeWithLabel(types: Record<string, TypeItem>, label: string) {
  for (const type of Object.values(types)) {
    if (type.label === label) {
      return type;
    }
  }
  return undefined;
}

/**
 * Makes a modified copy of the solc input to add state variables in each contract for namespaced struct definitions,
 * so that the compiler will generate their types in the storage layout.
 *
 * This deletes all functions for efficiency, since they are not needed for storage layout.
 * We also need to delete modifiers and immutable variables to avoid compilation errors due to deleted
 * functions and constructors.
 *
 * Also sets the outputSelection to only include storageLayout and ast, since the other outputs are not needed.
 *
 * @param input The original solc input.
 * @param output The original solc output.
 * @returns The modified solc input with storage layout that includes namespaced type information.
 */
export function makeNamespacedInputCopy(input: SolcInput, output: SolcOutput): SolcInput {
  const modifiedInput: SolcInput = JSON.parse(JSON.stringify(input));

  modifiedInput.settings = {
    outputSelection: {
      '*': {
        '*': ['storageLayout'],
        '': ['ast'],
      },
    },
  };

  for (const [sourcePath] of Object.entries(modifiedInput.sources)) {
    const source = modifiedInput.sources[sourcePath];
    if (source.content === undefined) {
      continue;
    }

    // Collect all contract definitions
    const contractDefs = [...findAll('ContractDefinition', output.sources[sourcePath].ast)];

    // Iterate backwards so we can delete source code without affecting remaining indices
    for (let i = contractDefs.length - 1; i >= 0; i--) {
      const contractDef = contractDefs[i];
      const nodes = contractDef.nodes;
      for (let j = nodes.length - 1; j >= 0; j--) {
        const node = nodes[j];
        if (
          isNodeType('FunctionDefinition', node) ||
          isNodeType('ModifierDefinition', node) ||
          isNodeType('VariableDeclaration', node)
        ) {
          const orig = Buffer.from(source.content);
          let buf = deleteNodeFromSource(node, orig);

          const doc = node.documentation;
          if (doc) {
            buf = deleteNodeFromSource(doc, buf);
          }

          source.content = buf.toString();
        } else if (isNodeType('StructDefinition', node)) {
          const storageLocationArg = getStorageLocationArg(node);
          if (storageLocationArg !== undefined) {
            const orig = Buffer.from(source.content);

            const [start, length] = node.src.split(':').map(Number);
            const end = start + length;

            const structName = node.name;
            const variableName = `$${structName}`;

            // Insert the variable declaration for the namespaced struct
            const buf = Buffer.concat([
              orig.subarray(0, end),
              Buffer.from(` ${structName} ${variableName};`),
              orig.subarray(end),
            ]);

            source.content = buf.toString();
          }
        }
      }
    }
  }
  return modifiedInput;
}
function deleteNodeFromSource(node: Node, orig: Buffer) {
  const [start, length] = node.src.split(':').map(Number);
  let end = start + length;

  // If the next character is a semicolon (e.g. for immutable variables), delete it too
  if (end + 1 < orig.length && orig.subarray(end, end + 1).toString() === ';') {
    end += 1;
  }

  // Delete the source code segment
  const buf = Buffer.concat([orig.subarray(0, start), orig.subarray(end)]);
  return buf;
}
