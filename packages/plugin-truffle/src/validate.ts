import path from 'path';
import { promises as fs } from 'fs';
import { findAll } from 'solidity-ast/utils';
import {
  validate,
  solcInputOutputDecoder,
  EthereumProvider,
  getNetworkId,
  RunValidation,
} from '@openzeppelin/upgrades-core';
import { SolcInput, SolcOutput, SolcLinkReferences } from '@openzeppelin/upgrades-core/dist/solc-api';

import { TruffleArtifact, ContractClass, NetworkObject } from './truffle';

export async function validateArtifacts(artifactsPath: string, sourcesPath: string): Promise<RunValidation> {
  const artifacts = await readArtifacts(artifactsPath);
  const { input, output } = reconstructSolcInputOutput(artifacts);
  const srcDecoder = solcInputOutputDecoder(input, output, sourcesPath);
  return validate(output, srcDecoder);
}

async function readArtifacts(artifactsPath: string): Promise<TruffleArtifact[]> {
  const artifactNames = await fs.readdir(artifactsPath);
  const artifactContents = await Promise.all(artifactNames.map(n => fs.readFile(path.join(artifactsPath, n), 'utf8')));
  return artifactContents.map(c => JSON.parse(c));
}

function reconstructSolcInputOutput(artifacts: TruffleArtifact[]): { input: SolcInput; output: SolcOutput } {
  const output: SolcOutput = { contracts: {}, sources: {} };
  const input: SolcInput = { sources: {} };

  const sourceUnitId: Partial<Record<string, number>> = {};

  for (const artifact of artifacts) {
    if (artifact.ast === undefined) {
      throw new Error('Artifact does not contain AST');
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

  for (const { ast } of Object.values(output.sources)) {
    for (const importDir of findAll('ImportDirective', ast)) {
      const importedUnitId = sourceUnitId[importDir.absolutePath];
      if (importedUnitId !== importDir.sourceUnit) {
        throw new Error(
          `Artifacts are from different compiler runs\n` +
            `    Run a full recompilation using \`truffle compile --all\`\n` +
            `    https://zpl.in/upgrades/truffle-recompile-all`,
        );
      }
    }
  }

  return { input, output };
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
  for (const name in networkInfo?.links) {
    const address = networkInfo?.links[name].replace(/^0x/, '') || '';
    const regex = new RegExp(`__${name}_+`, 'g');
    linkedBytecode = linkedBytecode.replace(regex, address);
  }
  return linkedBytecode;
}
