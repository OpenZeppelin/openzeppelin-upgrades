import path from 'path';
import { promises as fs } from 'fs';
import { findAll } from 'solidity-ast/utils';
import {
  validate,
  solcInputOutputDecoder,
  EthereumProvider,
  getNetworkId,
  ValidationRunData,
  UpgradesError,
} from '@openzeppelin/upgrades-core';
import type { SolcInput, SolcOutput, SolcLinkReferences } from '@openzeppelin/upgrades-core/dist/solc-api';

import { TruffleArtifact, ContractClass, NetworkObject } from './truffle';
import debug from './debug';

export async function validateArtifacts(artifactsPath: string, sourcesPath: string): Promise<ValidationRunData> {
  const artifacts = await readArtifacts(artifactsPath);
  const { input, output, solcVersion } = reconstructSolcInputOutput(artifacts);
  const srcDecoder = solcInputOutputDecoder(input, output, sourcesPath);
  return validate(output, srcDecoder, solcVersion);
}

async function readArtifacts(artifactsPath: string): Promise<TruffleArtifact[]> {
  const artifactNames = await fs.readdir(artifactsPath);
  const jsonArtifactNames = artifactNames.filter(a => a.endsWith('.json'));
  const artifactContents = await Promise.all(
    jsonArtifactNames.map(n => fs.readFile(path.join(artifactsPath, n), 'utf8')),
  );
  return artifactContents.map(c => JSON.parse(c));
}

function reconstructSolcInputOutput(artifacts: TruffleArtifact[]): {
  input: SolcInput;
  output: SolcOutput;
  solcVersion?: string;
} {
  const output: SolcOutput = { contracts: {}, sources: {} };
  const input: SolcInput = { sources: {} };
  let solcVersion;

  const sourceUnitId: Partial<Record<string, number>> = {};

  for (const artifact of artifacts) {
    if (artifact.ast === undefined) {
      // Artifact does not contain AST. It may be from a dependency.
      // We ignore it. If the contract is needed by the user it will fail later.
      continue;
    }
    if (artifact.compiler.name !== 'solc') {
      continue;
    }

    const versionMatch = artifact.compiler.version.match(/^([0-9.]+)\+commit/);
    if (!versionMatch) {
      throw new UpgradesError('Unknown or nightly compiler version');
    }
    const artifactSolcVersion = versionMatch[1];

    if (solcVersion === undefined) {
      solcVersion = artifactSolcVersion;
    } else if (solcVersion !== artifactSolcVersion) {
      throw new UpgradesError('Multiple Solidity versions found');
    }

    const { contractName, ast } = artifact;
    const sourcePath = ast.absolutePath;

    if (input.sources[sourcePath] === undefined) {
      input.sources[sourcePath] = { content: artifact.source };
    }

    if (output.sources[sourcePath] === undefined) {
      const [, , id] = ast.src.split(':').map(Number);
      output.sources[sourcePath] = { ast, id };
      sourceUnitId[sourcePath] = ast.id;
    }

    if (output.contracts[sourcePath] === undefined) {
      output.contracts[sourcePath] = {};
    }

    output.contracts[sourcePath][contractName] = {
      evm: {
        bytecode: {
          object: artifact.bytecode,
          linkReferences: reconstructLinkReferences(artifact.bytecode),
        },
      },
    };
  }

  checkForImportIdConsistency(sourceUnitId, input, output);

  return { input, output, solcVersion };
}

function checkForImportIdConsistency(
  sourceUnitId: Partial<Record<string, number>>,
  input: SolcInput,
  output: SolcOutput,
) {
  const dependencies = fromEntries(Object.keys(output.sources).map(p => [p, [] as string[]]));

  for (const source in output.sources) {
    const { ast } = output.sources[source];

    for (const importDir of findAll('ImportDirective', ast)) {
      const importedUnitId = sourceUnitId[importDir.absolutePath];
      if (importedUnitId === undefined) {
        // This can happen in three scenarios (we think):
        //
        // 1. There is more than one contract with the same name in different source files.
        //    Truffle only generates a single artifact.
        //    This scenario should have been detected before, and caused an error.
        //
        // 2. An imported file has only other import statements without an actual contract/library/interface.
        //    Truffle does not output the AST for this file.
        //    If this looks like an OpenZeppelin interface that transitively imports an interface at a different path,
        //    ignore this import.
        //
        // The code below corresponds to scenario 2.
        let ignoreImport = false;
        for (const sourceUnitPath of Object.keys(sourceUnitId)) {
          if (
            path.basename(importDir.absolutePath) === path.basename(sourceUnitPath) &&
            importDir.absolutePath.startsWith('@openzeppelin/')
          ) {
            debug(
              `Ignoring AST for import ${importDir.absolutePath} in ${source} since it has the same file name as the dependency ${sourceUnitPath}.`,
            );
            ignoreImport = true;
            break;
          }
        }
        if (ignoreImport) {
          continue;
        }

        // 3. A contract was imported from a dependency using artifacts.require.
        //    Truffle copies the artifact over, and its dependencies are not available.
        //    We don't want to include this contract in the reconstructed solc output.
        //    People should create a Solidity file importing the contract they want.
        //
        // The code below corresponds to scenario 3. We remove all transitive dependents
        // on this file.
        const queue = [ast.absolutePath];
        for (const source of queue) {
          delete output.contracts[source];
          delete output.sources[source];
          delete input.sources[source];
          queue.push(...dependencies[source]);
        }
        break;
      } else if (importedUnitId !== importDir.sourceUnit) {
        throw new UpgradesError(
          `Artifacts are from different compiler runs\n` +
            `    Run a full recompilation using \`truffle compile --all\`\n` +
            `    https://zpl.in/upgrades/truffle-recompile-all`,
        );
      } else {
        dependencies[importDir.absolutePath].push(ast.absolutePath);
      }
    }
  }
}

function reconstructLinkReferences(bytecode: string): SolcLinkReferences {
  const linkReferences: SolcLinkReferences = {};
  const delimiter = '__';
  const length = 20;

  // Extract placeholders from bytecode
  for (let index = 0; index < bytecode.length; ) {
    const pos = bytecode.indexOf(delimiter, index);
    if (pos === -1) {
      break;
    }
    // Process link reference
    const placeHolder = bytecode.substr(pos, length);
    const libName = placeHolder.substr(2, placeHolder.indexOf(delimiter, 2) - 2);
    linkReferences['*'] ??= {};
    linkReferences['*'][libName] ??= [];
    linkReferences['*'][libName].push({ length, start: pos / 2 });

    index += pos + length * 2;
  }

  return linkReferences;
}

export async function getLinkedBytecode(Contract: ContractClass, provider: EthereumProvider): Promise<string> {
  const networkId = await getNetworkId(provider);
  const networkInfo: NetworkObject | undefined = Contract.networks?.[networkId];

  let linkedBytecode = Contract.bytecode;

  const links = networkInfo?.links;
  for (const name in links) {
    const address = links[name].replace(/^0x/, '');
    const regex = new RegExp(`__${name}_+`, 'g');
    linkedBytecode = linkedBytecode.replace(regex, address);
  }

  return linkedBytecode;
}

function fromEntries<K extends string | symbol | number, V>(entries: [K, V][]): Record<K, V> {
  const res = {} as Record<K, V>;
  for (const [key, value] of entries) {
    res[key] = value;
  }
  return res;
}
