import { isNodeType } from 'solidity-ast/utils';
import { Node } from 'solidity-ast/node';
import { SolcInput, SolcOutput } from '../solc-api';
import { getStorageLocationAnnotation } from '../storage/namespace';
import { assert } from './assert';

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
 * - Deletes all contracts' functions since they are not needed for storage layout
 * - Deletes all contracts' modifiers, variables, and parent constructor invocations to avoid compilation errors due to deleted functions and constructors
 * - Deletes all using for directives (at file level and in contracts) since they may reference deleted functions
 * - Converts all free functions and constants (at file level) to dummy variables (do not delete them since they might be imported by other files)
 *
 * Also sets the outputSelection to only include storageLayout and ast, since the other outputs are not needed.
 *
 * @param input The original solc input.
 * @param output The original solc output.
 * @returns The modified solc input with storage layout that includes namespaced type information.
 */
export function makeNamespacedInput(input: SolcInput, output: SolcOutput): SolcInput {
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
      if (isNodeType('ContractDefinition', node)) {
        const contractDef = node;

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
          if (
            isNodeType('FunctionDefinition', contractNode) ||
            isNodeType('ModifierDefinition', contractNode) ||
            isNodeType('VariableDeclaration', contractNode)
          ) {
            if (contractNode.documentation) {
              modifications.push(makeDelete(contractNode.documentation, orig));
            }
            modifications.push(makeDelete(contractNode, orig));
          } else if (isNodeType('UsingForDirective', contractNode)) {
            modifications.push(makeDelete(contractNode, orig));
          } else if (isNodeType('StructDefinition', contractNode)) {
            const storageLocation = getStorageLocationAnnotation(contractNode);
            if (storageLocation !== undefined) {
              const structName = contractNode.name;
              const variableName = `$${structName}_${(Math.random() * 1e6).toFixed(0)}`;
              const insertText = ` ${structName} ${variableName};`;

              modifications.push(makeInsertAfter(contractNode, insertText));
            }
          }
        }
      } else if (isNodeType('FunctionDefinition', node) || isNodeType('VariableDeclaration', node)) {
        if (node.documentation) {
          modifications.push(makeDelete(node.documentation, orig));
        }
        // Replace with a dummy variable of arbitrary type
        const name = node.name;
        const insertText = `uint256 constant ${name} = 0;`;
        modifications.push(makeReplace(node, orig, insertText));
      } else if (isNodeType('UsingForDirective', node)) {
        modifications.push(makeDelete(node, orig));
      }
    }

    modifiedSources[sourcePath] = { ...source, content: getModifiedSource(orig, modifications) };
  }

  return { ...input, sources: modifiedSources, settings: { ...input.settings, outputSelection: OUTPUT_SELECTION } };
}

interface Modification {
  start: number;
  end: number;
  text?: string;
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

function makeInsertAfter(node: Node, text: string): Modification {
  const { end } = getPositions(node);
  return { start: end, end, text };
}

function makeDelete(node: Node, orig: Buffer): Modification {
  const positions = getPositions(node);
  let end = positions.end;
  // If the next character is a semicolon for variables, skip over it
  if (isNodeType('VariableDeclaration', node) && end + 1 < orig.length && orig.toString('utf8', end, end + 1) === ';') {
    end += 1;
  }
  return { start: positions.start, end };
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
