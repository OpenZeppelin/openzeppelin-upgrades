import { findAll, isNodeType } from 'solidity-ast/utils';
import { Node } from 'solidity-ast/node';
import { SolcInput, SolcOutput } from '../solc-api';
import { getStorageLocationArg } from '../storage/namespace';

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

    const modifications: Modification[] = [];

    for (const contractDef of findAll('ContractDefinition', output.sources[sourcePath].ast)) {
      const nodes = contractDef.nodes;
      for (const node of nodes) {
        if (
          isNodeType('FunctionDefinition', node) ||
          isNodeType('ModifierDefinition', node) ||
          isNodeType('VariableDeclaration', node)
        ) {
          const doc = node.documentation;
          if (doc) {
            modifications.push(getDelete(doc));
          }
          modifications.push(getDelete(node));
        } else if (isNodeType('StructDefinition', node)) {
          const storageLocationArg = getStorageLocationArg(node);
          if (storageLocationArg !== undefined) {
            const structName = node.name;
            const variableName = `$${structName}`;
            const insertText = ` ${structName} ${variableName};`;

            modifications.push(getInsert(node, insertText));
          }
        }
      }
    }

    source.content = getModifiedSource(source.content, modifications);
  }
  return modifiedInput;
}

interface Modification {
  start: number;
  end: number;
  kind: 'insert' | 'delete';
  text?: string;
}

function getPositions(node: Node) {
  const [start, length] = node.src.split(':').map(Number);
  const end = start + length;
  return { start, end };
}

function getInsert(node: Node, text: string): Modification {
  const { end } = getPositions(node);
  return { start: end, end: end, kind: 'insert' as const, text };
}

function getDelete(node: Node): Modification {
  const { start, end } = getPositions(node);
  return { start, end, kind: 'delete' as const };
}

function getModifiedSource(sourceContent: string, modifications: Modification[]): string {
  const orig = Buffer.from(sourceContent, 'utf8');

  let result = '';
  let copyFromIndex = 0;

  for (const modification of modifications) {
    result += orig.subarray(copyFromIndex, modification.start).toString();

    if (modification.kind === 'insert') {
      result += modification.text;
      copyFromIndex = modification.end;
    } else {
      // delete
      if (
        modification.end + 1 < orig.length &&
        orig.subarray(modification.end, modification.end + 1).toString() === ';'
      ) {
        // If the next character is a semicolon (e.g. for variables), skip over it
        copyFromIndex = modification.end + 1;
      } else {
        copyFromIndex = modification.end;
      }
    }
  }

  if (copyFromIndex < orig.length) {
    result += orig.subarray(copyFromIndex).toString();
  }

  return result;
}
