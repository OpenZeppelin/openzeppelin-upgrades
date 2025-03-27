import { isNodeType } from 'solidity-ast/utils';
import { Node } from 'solidity-ast/node';
import { SolcInput, SolcOutput } from '../solc-api';
import { getStorageLocationAnnotation } from '../storage/namespace';
import { assert, assertUnreachable } from './assert';
import { ContractDefinition, FunctionDefinition, VariableDeclaration } from 'solidity-ast';

const OUTPUT_SELECTION = {
  '*': {
    '*': ['storageLayout'],
    '': ['ast'],
  },
};

/**
 * Makes a modified version of the solc input to add state variables in each contract for namespaced struct definitions,
 * so that the compiler will generate their types in the storage layout.
 *
 * This makes the following modifications to the input:
 * - Adds a state variable for each namespaced struct definition
 * - For each contract, for all node types that are not needed for storage layout or may call functions and constructors, converts them to dummy enums with random id
 * - Mark contracts as abstract, since state variables are converted to dummy enums which would not generate public getters for inherited interface functions
 * - Converts all using for directives (at file level and in contracts) to dummy enums with random id (do not delete them to avoid orphaning possible NatSpec documentation)
 * - Converts all custom errors and constants (at file level) to dummy enums with the same name (do not delete them since they might be imported by other files)
 * - Replaces functions as follows:
 *   - For regular function and free function, keep declarations since they may be referenced by constants (free functions may also be imported by other files). But simplify compilation as follows:
 *     - Avoid having to initialize return parameters: convert function to virtual if possible, or convert return parameters to bools which can be default initialized.
 *     - Delete modifiers
 *     - Delete function bodies
 *   - Constructors are not needed, since we removed anything that may call constructors. Convert to dummy enums to avoid orphaning possible NatSpec.
 *   - Fallback and receive functions are not needed, since they don't have signatures. Convert to dummy enums to avoid orphaning possible NatSpec.
 *
 * Also sets the outputSelection to only include storageLayout and ast, since the other outputs are not needed.
 *
 * @param input The original solc input.
 * @param output The original solc output.
 * @param _solcVersion The version of the solc compiler that was originally used to compile the input. This argument is no longer used and is kept for backwards compatibility.
 * @returns The modified solc input with storage layout that includes namespaced type information.
 */
export function makeNamespacedInput(input: SolcInput, output: SolcOutput, _solcVersion?: string): SolcInput {
  const modifiedSources: Record<string, { content?: string }> = {};

  for (const [sourcePath] of Object.entries(input.sources)) {
    const source = input.sources[sourcePath];

    if (source.content === undefined) {
      modifiedSources[sourcePath] = source;
      continue;
    }

    const orig = Buffer.from(source.content, 'utf8');

    const modifications: Modification[] = [];

    for (const node of output.sources[sourcePath].ast.nodes) {
      switch (node.nodeType) {
        case 'ContractDefinition': {
          const contractDef = node;

          // Mark contracts as abstract, since state variables are converted to dummy enums
          // which would not generate public getters for inherited interface functions
          if (contractDef.contractKind === 'contract' && !contractDef.abstract) {
            modifications.push(makeInsertBefore(contractDef, 'abstract '));
          }

          // Remove custom layout annotation
          if (contractDef.storageLayout !== undefined) {
            modifications.push(makeDelete(contractDef.storageLayout, orig));
          }

          // Remove any calls to parent constructors from the inheritance list
          const inherits = contractDef.baseContracts;
          for (const inherit of inherits) {
            if (Array.isArray(inherit.arguments)) {
              assert(inherit.baseName.name !== undefined);
              modifications.push(makeReplace(inherit, orig, inherit.baseName.name));
            }
          }

          const contractNodes = contractDef.nodes;
          for (const contractNode of contractNodes) {
            switch (contractNode.nodeType) {
              case 'FunctionDefinition': {
                replaceFunction(contractNode, orig, modifications, contractDef);
                break;
              }
              case 'VariableDeclaration': {
                // If variable is a constant, keep it since it may be referenced in a struct
                if (contractNode.constant) {
                  break;
                }
                // Otherwise, fall through to convert to dummy enum
              }
              case 'ErrorDefinition':
              case 'EventDefinition':
              case 'ModifierDefinition':
              case 'UsingForDirective': {
                // Replace with an enum based on astId (the original name is not needed, since nothing should reference it)
                modifications.push(makeReplace(contractNode, orig, toDummyEnumWithAstId(contractNode.id)));
                break;
              }
              case 'StructDefinition': {
                // Do not add state variable in a library or interface, since that is not allowed by Solidity
                if (contractDef.contractKind !== 'contract') {
                  continue;
                }
                const storageLocation = getStorageLocationAnnotation(contractNode);
                if (storageLocation !== undefined) {
                  const structName = contractNode.name;
                  const variableName = `$${structName}_${(Math.random() * 1e6).toFixed(0)}`;
                  const insertText = ` ${structName} ${variableName};`;

                  modifications.push(makeInsertAfter(contractNode, insertText));
                }
                break;
              }
              case 'EnumDefinition':
              case 'UserDefinedValueTypeDefinition':
              default: {
                // - EnumDefinition may be used in structures with storage locations
                // - UserDefinedValueTypeDefinition may be used in structures with storage locations
                // - default: in case unexpected ast nodes show up
                break;
              }
            }
          }
          break;
        }

        case 'FunctionDefinition': {
          replaceFunction(node, orig, modifications);
          break;
        }

        // - VariableDeclaration and ErrorDefinition might be imported by other files, so they cannot be deleted.
        //   However, we need to remove their values to avoid referencing other deleted nodes.
        //   We do this by converting them to dummy enums with the same name.
        case 'VariableDeclaration': {
          // If variable is a constant, keep it since it may be referenced in a struct
          if (node.constant) {
            break;
          }
          // Otherwise, fall through to convert to dummy enum
        }
        case 'ErrorDefinition': {
          modifications.push(makeReplace(node, orig, toDummyEnumWithName(node.name)));
          break;
        }
        // - UsingForDirective isn't needed, but it might have NatSpec documentation which is not included in the AST.
        //   We convert it to a dummy enum to avoid orphaning any possible documentation.
        case 'UsingForDirective':
          modifications.push(makeReplace(node, orig, toDummyEnumWithAstId(node.id)));
          break;
        case 'EnumDefinition':
        case 'ImportDirective':
        case 'PragmaDirective':
        case 'StructDefinition':
        case 'UserDefinedValueTypeDefinition':
        default: {
          // - EnumDefinition may be used in structures with storage locations
          // - ImportDirective may import types used in structures with storage locations
          // - PragmaDirective is necessary for compilation
          // - StructDefinition may be used in structures with storage locations
          // - UserDefinedValueTypeDefinition may be used in structures with storage locations
          // - default: in case unexpected ast nodes show up (file-level events since 0.8.22)
          break;
        }
      }
    }

    modifiedSources[sourcePath] = { ...source, content: getModifiedSource(orig, modifications) };
  }

  return { ...input, sources: modifiedSources, settings: { ...input.settings, outputSelection: OUTPUT_SELECTION } };
}

/**
 * Attempts to remove all NatSpec comments that do not precede a struct definition from the input source contents.
 * Directly modifies the input source contents, and also returns the modified input.
 *
 * If the solc version is not supported by the parser, the original content is kept.
 *
 * @param solcInput Solc input.
 * @param solcVersion The version of the solc compiler that was originally used to compile the input.
 * @returns The modified solc input with NatSpec comments removed where they do not precede a struct definition.
 */
export async function trySanitizeNatSpec(solcInput: SolcInput, solcVersion: string): Promise<SolcInput> {
  for (const [sourcePath, source] of Object.entries(solcInput.sources)) {
    if (source.content !== undefined) {
      solcInput.sources[sourcePath].content = await tryRemoveNonStructNatSpec(source.content, solcVersion);
    }
  }
  return solcInput;
}

/**
 * If Slang is supported for the current compiler version, use Slang to parse and remove all NatSpec comments
 * that do not precede a struct definition and return the modified content.
 *
 * Otherwise, return the original content.
 */
async function tryRemoveNonStructNatSpec(origContent: string, solcVersion: string): Promise<string> {
  if (solcVersion === undefined) {
    return origContent;
  }

  const { Parser } = await import('@nomicfoundation/slang/parser');
  if (!Parser.supportedVersions().includes(solcVersion)) {
    return origContent;
  }

  const { TerminalKind, TerminalKindExtensions } = await import('@nomicfoundation/slang/cst');

  const parser = Parser.create(solcVersion);
  const parseOutput = parser.parse(Parser.rootKind(), origContent);
  const cursor = parseOutput.createTreeCursor();

  const natSpecRemovals: Modification[] = [];

  while (
    cursor.goToNextTerminalWithKinds([TerminalKind.MultiLineNatSpecComment, TerminalKind.SingleLineNatSpecComment])
  ) {
    // Lookahead to determine if the next non-trivia node is the struct keyword.
    // If so, this NatSpec is part of the struct definition and should not be removed.
    const lookaheadCursor = cursor.clone();
    while (
      lookaheadCursor.goToNextTerminal() &&
      lookaheadCursor.node.isTerminalNode() &&
      TerminalKindExtensions.isTrivia(lookaheadCursor.node.kind)
    ) {
      // skip over trivia nodes
    }

    if (lookaheadCursor.node.kind === TerminalKind.StructKeyword) {
      continue;
    }

    natSpecRemovals.push(makeDeleteRange(cursor.textRange.start.utf8, cursor.textRange.end.utf8));
  }

  return getModifiedSource(Buffer.from(origContent, 'utf8'), natSpecRemovals);
}

interface Modification {
  start: number;
  end: number;
  text?: string;
}

function toDummyEnumWithName(name: string) {
  return `enum ${name} { dummy }`;
}

function toDummyEnumWithAstId(astId: number) {
  return `enum $astId_${astId}_${(Math.random() * 1e6).toFixed(0)} { dummy }`;
}

function replaceFunction(
  node: FunctionDefinition,
  orig: Buffer,
  modifications: Modification[],
  contractDef?: ContractDefinition,
) {
  switch (node.kind) {
    case 'freeFunction':
    case 'function': {
      let virtual = node.virtual;

      if (
        contractDef !== undefined &&
        contractDef.contractKind === 'contract' &&
        node.visibility !== 'private' &&
        !virtual
      ) {
        assert(node.kind !== 'freeFunction');

        // If this is a contract function and not private, it could possibly override an interface function.
        // We don't want to change its return parameters because that might cause a mismatch with the interface.
        // Simply convert the function to virtual (if not already)
        modifications.push(makeInsertAfter(node.parameters, ' virtual '));
        virtual = true;
      }

      if (node.modifiers.length > 0) {
        // Delete modifiers
        for (const modifier of node.modifiers) {
          modifications.push(makeDelete(modifier, orig));
        }
      }

      if (node.body) {
        // Delete body
        if (virtual) {
          modifications.push(makeReplace(node.body, orig, ';'));
        } else {
          // This is a non-virtual function with a body, so that means it is not an interface function.
          assert(contractDef?.contractKind !== 'interface');
          // Since all contract functions that are non-private were converted to virtual above, this cannot possibly override another function.
          assert(!node.overrides);

          // The remaining scenarios may mean this is a library function, free function, or private function.
          // In any of these cases, we can convert the return parameters to bools so that they can be default initialized.
          if (node.returnParameters.parameters.length > 0) {
            modifications.push(
              makeReplace(
                node.returnParameters,
                orig,
                `(${node.returnParameters.parameters.map(param => toReturnParameterReplacement(param)).join(', ')})`,
              ),
            );
          }
          modifications.push(makeReplace(node.body, orig, '{}'));
        }
      }

      break;
    }
    case 'constructor':
    case 'fallback':
    case 'receive': {
      modifications.push(makeReplace(node, orig, toDummyEnumWithAstId(node.id)));
      break;
    }
    default:
      return assertUnreachable(node.kind);
  }
}

function toReturnParameterReplacement(param: VariableDeclaration) {
  if (param.name.length > 0) {
    return `bool ${param.name}`;
  } else {
    return 'bool';
  }
}

function getPositions(node: Node) {
  const [start, length] = node.src.split(':').map(Number);
  const end = start + length;
  return { start, end };
}

function makeReplace(node: Node, orig: Buffer, text: string): Modification {
  // Replace is a delete and insert
  const { start, end } = makeDelete(node, orig);
  return { start, end, text };
}

function makeInsertBefore(node: Node, text: string): Modification {
  const { start } = getPositions(node);
  return { start: start, end: start, text };
}

function makeInsertAfter(node: Node, text: string): Modification {
  const { end } = getPositions(node);
  return { start: end, end, text };
}

function makeDelete(node: Node, orig: Buffer): Modification {
  const positions = getPositions(node);
  let end = positions.end;
  // For variables, skip past whitespaces and the first semicolon
  if (isNodeType('VariableDeclaration', node)) {
    while (end + 1 < orig.length && orig.toString('utf8', end, end + 1).trim() === '') {
      end += 1;
    }
    if (end + 1 < orig.length && orig.toString('utf8', end, end + 1) === ';') {
      end += 1;
    }
  }
  return makeDeleteRange(positions.start, end);
}

function makeDeleteRange(start: number, end: number): Modification {
  return { start, end };
}

function getModifiedSource(orig: Buffer, modifications: Modification[]): string {
  let result = '';
  let copyFromIndex = 0;

  for (const modification of modifications) {
    assert(modification.start >= copyFromIndex);
    result += orig.toString('utf8', copyFromIndex, modification.start);

    if (modification.text !== undefined) {
      result += modification.text;
    }

    copyFromIndex = modification.end;
  }

  assert(copyFromIndex <= orig.length);
  result += orig.toString('utf8', copyFromIndex);

  return result;
}
