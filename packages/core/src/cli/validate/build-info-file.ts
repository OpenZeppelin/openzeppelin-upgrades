import { SolcOutput, SolcInput } from '../..';

import { promises as fs } from 'fs';
import path from 'path';
import { ValidateCommandError } from './error';

const HARDHAT_COMPILE_COMMAND = 'npx hardhat clean && npx hardhat compile';
const FOUNDRY_COMPILE_COMMAND = 'forge clean && forge build';
const STORAGE_LAYOUT_HELP = `\
If using Hardhat, include the 'storageLayout' output selection in your Hardhat config:
  module.exports = {
    solidity: {
      settings: {
        outputSelection: {
          '*': {
            '*': ['storageLayout'],
          },
        },
      },
    },
  };
Then recompile your contracts with '${HARDHAT_COMPILE_COMMAND}' and try again.

If using Foundry, include the "storageLayout" extra output in foundry.toml:
  [profile.default]
  build_info = true
  extra_output = ["storageLayout"]
Then recompile your contracts with '${FOUNDRY_COMPILE_COMMAND}' and try again.`;
const PARTIAL_COMPILE_HELP = `\
Recompile all contracts with one of the following commands and try again:
If using Hardhat: ${HARDHAT_COMPILE_COMMAND}
If using Foundry: ${FOUNDRY_COMPILE_COMMAND}`;

/**
 * A build info file containing Solidity compiler input and output JSON objects.
 */
export interface BuildInfoFile {
  /**
   * The Solidity compiler version.
   */
  solcVersion: string;

  /**
   * The Solidity compiler input JSON object.
   */
  input: SolcInput;

  /**
   * The Solidity compiler output JSON object.
   */
  output: SolcOutput;

  /**
   * Short name of the build info dir containing this file.
   */
  dirShortName: string;
}

/**
 * Gets the build info files from the build info directory.
 *
 * @param buildInfoDir Build info directory, or undefined to use the default Hardhat or Foundry build-info dir.
 * @returns The build info files with Solidity compiler input and output.
 */
export async function getBuildInfoFiles(buildInfoDir?: string): Promise<BuildInfoFile[]> {
  const dir = await findDir(buildInfoDir);
  const shortName = path.basename(dir);
  const jsonFiles = await getJsonFiles(dir);

  return await readBuildInfo(jsonFiles, shortName);
}

/**
 * Finds the build info dir if provided, otherwise finds the default Hardhat or Foundry build info dir. Throws an error if no build info files were found in the expected dir.
 */
async function findDir(buildInfoDir?: string): Promise<string> {
  if (buildInfoDir !== undefined && !(await hasJsonFiles(buildInfoDir))) {
    throw new ValidateCommandError(
      `The directory '${buildInfoDir}' does not exist or does not contain any build info files.`,
      () => `\
If using Foundry, ensure your foundry.toml file has build_info = true.
Compile your contracts with '${HARDHAT_COMPILE_COMMAND}' or '${FOUNDRY_COMPILE_COMMAND}' and try again with the correct path to the build info directory.`,
    );
  }
  const dir = buildInfoDir ?? (await findDefaultDir());
  return dir;
}

async function findDefaultDir() {
  const hardhatRelativeDir = path.join('artifacts', 'build-info');
  const foundryRelativeDir = path.join('out', 'build-info');

  const hardhatDir = path.join(process.cwd(), hardhatRelativeDir);
  const foundryDir = path.join(process.cwd(), foundryRelativeDir);

  const hasHardhatBuildInfo = await hasJsonFiles(hardhatDir);
  const hasFoundryBuildInfo = await hasJsonFiles(foundryDir);

  if (hasHardhatBuildInfo && hasFoundryBuildInfo) {
    throw new ValidateCommandError(
      `Found both Hardhat and Foundry build info directories: '${hardhatRelativeDir}' and '${foundryRelativeDir}'.`,
      () => `Specify the build info directory that you want to validate.`,
    );
  } else if (hasHardhatBuildInfo) {
    return hardhatDir;
  } else if (hasFoundryBuildInfo) {
    return foundryDir;
  } else {
    throw new ValidateCommandError(
      `Could not find the default Hardhat or Foundry build info directory.`,
      () =>
        `Compile your contracts with '${HARDHAT_COMPILE_COMMAND}' or '${FOUNDRY_COMPILE_COMMAND}', or specify the build info directory that you want to validate.`,
    );
  }
}

async function hasJsonFiles(dir: string) {
  return (await exists(dir)) && (await getJsonFiles(dir)).length > 0;
}

async function exists(dir: string) {
  try {
    await fs.access(dir);
    return true;
  } catch (e) {
    return false;
  }
}

async function getJsonFiles(dir: string): Promise<string[]> {
  const files = await fs.readdir(dir);
  const jsonFiles = files.filter(file => file.endsWith('.json') && !file.endsWith('.output.json'));
  return jsonFiles.map(file => path.join(dir, file));
}

async function readBuildInfo(buildInfoFilePaths: string[], dirShortName: string) {
  const buildInfoFiles: BuildInfoFile[] = [];

  for (const buildInfoFilePath of buildInfoFilePaths) {
    const buildInfo = await loadBuildInfo(buildInfoFilePath);

    checkOutputSelection(buildInfo.input, buildInfoFilePath);

    buildInfoFiles.push({
      input: buildInfo.input,
      output: buildInfo.output,
      solcVersion: buildInfo.solcVersion,
      dirShortName,
    });
  }
  return buildInfoFiles;
}

async function loadBuildInfo(buildInfoFilePath: string): Promise<{
  input: SolcInput;
  output: SolcOutput;
  solcVersion: string;
}> {
  const buildInfoJson = await readJSON(buildInfoFilePath);

  if (buildInfoJson.input !== undefined && buildInfoJson.output !== undefined && buildInfoJson.solcVersion !== undefined) {
    return {
      input: buildInfoJson.input,
      output: buildInfoJson.output,
      solcVersion: buildInfoJson.solcVersion,
    };
  }

  const format = buildInfoJson._format as string | undefined;

  if (typeof format === 'string' && (format.startsWith('hh3-sol-build-info') || format.startsWith('hh-sol-build-info'))) {
    if (buildInfoJson.input !== undefined && buildInfoJson.solcVersion !== undefined) {
      let inputData: SolcInput = buildInfoJson.input;
      let outputData: SolcOutput | undefined = buildInfoJson.output;

      if (outputData === undefined) {
        const { dir, name } = path.parse(buildInfoFilePath);
        const outputFilePath = path.join(dir, `${name}.output.json`);

        try {
          const outputJson = await readJSON(outputFilePath);
          outputData = outputJson.output ?? outputJson;
        } catch (error) {
          throw new ValidateCommandError(
            `Build info file ${buildInfoFilePath} does not contain output, and output file ${outputFilePath} could not be read.`,
          );
        }

        if (outputData === undefined) {
          throw new ValidateCommandError(
            `Build info file ${buildInfoFilePath} does not contain output, and output file ${outputFilePath} is missing Solidity compiler output.`,
          );
        }
      }

      const userSourceNameMap: Record<string, string> | undefined = buildInfoJson.userSourceNameMap;
      if (userSourceNameMap !== undefined) {
        const canonicalToUser = Object.entries(userSourceNameMap).reduce<Record<string, string>>((acc, [userSource, canonicalSource]) => {
          acc[canonicalSource] = userSource;
          return acc;
        }, {});

        if (inputData.sources !== undefined) {
          inputData = {
            ...inputData,
            sources: remapKeys(inputData.sources, canonicalToUser),
          };
        }

        if (outputData.sources !== undefined) {
          outputData = {
            ...outputData,
            sources: remapKeys(outputData.sources, canonicalToUser),
            contracts: outputData.contracts !== undefined ? remapKeys(outputData.contracts, canonicalToUser) : outputData.contracts,
          };
        } else if (outputData.contracts !== undefined) {
          outputData = {
            ...outputData,
            contracts: remapKeys(outputData.contracts, canonicalToUser),
          };
        }
      }

      return {
        input: inputData,
        output: outputData,
        solcVersion: buildInfoJson.solcVersion,
      };
    }
  }

  throw new ValidateCommandError(
    `Build info file ${buildInfoFilePath} must contain Solidity compiler input, output, and solcVersion. Got format: ${format ?? 'unknown'}.`,
  );
}

/**
 * Gives an error if there is empty output selection for any contract, or a contract does not have storage layout.
 */
function checkOutputSelection(input: SolcInput, buildInfoFilePath: string) {
  const outputSelection = input.settings?.outputSelection;

  if (outputSelection === undefined) {
    throw new ValidateCommandError(
      `Build info file ${buildInfoFilePath} does not define compiler outputSelection.`,
      () => STORAGE_LAYOUT_HELP,
    );
  }

  Object.keys(outputSelection).forEach(item => {
    const selection = outputSelection[item] ?? {};
    const unnamed = Array.isArray(selection['']) ? selection[''] : [];
    const wildcard = Array.isArray(selection['*']) ? selection['*'] : [];

    if (unnamed.length === 0 && wildcard.length === 0) {
      // No outputs at all for this contract e.g. if there were no changes since the last compile in Foundry.
      // This is not supported for now, since it leads to AST nodes that reference node ids in other build-info files.
      throw new ValidateCommandError(
        `Build info file ${buildInfoFilePath} is not from a full compilation.`,
        () => PARTIAL_COMPILE_HELP,
      );
    } else if (!wildcard.includes('storageLayout')) {
      throw new ValidateCommandError(
        `Build info file ${buildInfoFilePath} does not contain storage layout for all contracts.`,
        () => STORAGE_LAYOUT_HELP,
      );
    }
  });
}

async function readJSON(path: string) {
  return JSON.parse(await fs.readFile(path, 'utf8'));
}

function remapKeys<T>(original: Record<string, T>, canonicalToUser: Record<string, string>): Record<string, T> {
  const remapped: Record<string, T> = {};
  for (const [key, value] of Object.entries(original)) {
    const mappedKey = canonicalToUser[key] ?? key;
    remapped[mappedKey] = value;
  }
  return remapped;
}
