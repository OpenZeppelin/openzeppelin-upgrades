import { findAll, isNodeType } from 'solidity-ast/utils';
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
 * This deletes all functions for efficiency, since they are not needed for storage layout.
 * We also need to delete modifiers, variables, and parent constructor invocations to avoid compilation errors due to deleted
 * functions and constructors.
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

    for (const contractDef of findAll('ContractDefinition', output.sources[sourcePath].ast)) {
      // Remove any calls to parent constructors from the inheritance list
      const inherits = contractDef.baseContracts;
      for (const inherit of inherits) {
        if (isNodeType('InheritanceSpecifier', inherit)) {
          assert(inherit.baseName.name !== undefined);
          modifications.push(makeReplace(inherit, inherit.baseName.name));
        }
      }

      const nodes = contractDef.nodes;
      for (const node of nodes) {
        if (
          isNodeType('FunctionDefinition', node) ||
          isNodeType('ModifierDefinition', node) ||
          isNodeType('VariableDeclaration', node)
        ) {
          const doc = node.documentation;
          if (doc) {
            modifications.push(makeDelete(doc, orig));
          }
          modifications.push(makeDelete(node, orig));
        } else if (isNodeType('StructDefinition', node)) {
          const storageLocation = getStorageLocationAnnotation(node);
          if (storageLocation !== undefined) {
            const structName = node.name;
            const variableName = `$${structName}_${(Math.random() * 1e6).toFixed(0)}`;
            const insertText = ` ${structName} ${variableName};`;

            modifications.push(makeInsertAfter(node, insertText));
          }
        }
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

function makeReplace(node: Node, text: string): Modification {
  const { start, end } = getPositions(node);
  return { start, end, text };
}

function makeInsertAfter(node: Node, text: string): Modification {
  const { end } = getPositions(node);
  return { start: end, end, text };
}

function makeDelete(node: Node, orig: Buffer): Modification {
  const positions = getPositions(node);
  let end = positions.end;
  // If the next character is a semicolon (e.g. for variables), skip over it
  if (end + 1 < orig.length && orig.toString('utf8', end, end + 1) === ';') {
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
