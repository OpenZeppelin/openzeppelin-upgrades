import { SolcOutput, SolcInput } from '../..';

import { promises as fs } from 'fs';
import path from 'path';

const HARDHAT_COMPILE_COMMAND = 'npx hardhat compile';
const FOUNDRY_COMPILE_COMMAND = 'forge clean && forge build --build-info --extra-output storageLayout';

/**
 * A build info file containing Solidity compiler input and output JSON objects.
 */
export interface BuildInfoFile {
  /**
   * The Solidity compiler input JSON object.
   */
  input: SolcInput;

  /**
   * The Solidity compiler output JSON object.
   */
  output: SolcOutput;
}

/**
 * Gets the build info files from the build info directory.
 *
 * @param buildInfoDir Build info directory, or undefined to use the default Hardhat or Foundry build-info dir.
 * @returns The build info files with Solidity compiler input and output.
 */
export async function getBuildInfoFiles(buildInfoDir?: string) {
  const dir = await findDir(buildInfoDir);
  const jsonFiles = await getJsonFiles(dir);
  return await readBuildInfo(jsonFiles);
}

async function findDir(buildInfoDir: string | undefined) {
  if (buildInfoDir !== undefined && !(await hasJsonFiles(buildInfoDir))) {
    throw new Error(
      `The directory '${buildInfoDir}' does not exist or does not contain any build info files. Compile your contracts with '${HARDHAT_COMPILE_COMMAND}' or '${FOUNDRY_COMPILE_COMMAND}' and try again with the correct path to the build info directory.`,
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
    throw new Error(
      `Found both Hardhat and Foundry build info directories: '${hardhatRelativeDir}' and '${foundryRelativeDir}'. Specify the build info directory that you want to validate.`,
    );
  } else if (hasHardhatBuildInfo) {
    return hardhatDir;
  } else if (hasFoundryBuildInfo) {
    return foundryDir;
  } else {
    throw new Error(
      `Could not find the default Hardhat or Foundry build info directory. Compile your contracts with '${HARDHAT_COMPILE_COMMAND}' or '${FOUNDRY_COMPILE_COMMAND}', or specify the build info directory that you want to validate.`,
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
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  return jsonFiles.map(file => path.join(dir, file));
}

async function readBuildInfo(buildInfoFilePaths: string[]) {
  const buildInfoFiles: BuildInfoFile[] = [];

  for (const buildInfoFilePath of buildInfoFilePaths) {
    const buildInfoJson = await readJSON(buildInfoFilePath);
    if (buildInfoJson.input === undefined || buildInfoJson.output === undefined) {
      throw new Error(`Build info file ${buildInfoFilePath} must contain Solidity compiler input and output.`);
    } else {
      if (!hasStorageLayoutSetting(buildInfoJson)) {
        throw new Error(
          `Build info file ${buildInfoFilePath} does not contain storage layout.\n` +
            `\n` +
            `If using Hardhat, include the 'storageLayout' output selection in your Hardhat config:\n` +
            `module.exports = {\n` +
            `  solidity: {\n` +
            `    settings: {\n` +
            `      outputSelection: {\n` +
            `        '*': {\n` +
            `          '*': ['storageLayout'],\n` +
            `        },\n` +
            `      },\n` +
            `    },\n` +
            `  },\n` +
            `};\n` +
            `Then recompile your contracts with '${HARDHAT_COMPILE_COMMAND}' and try again.\n` +
            `\n` +
            `If using Foundry, recompile your contracts with '${FOUNDRY_COMPILE_COMMAND}' and try again.`,
        );
      }

      buildInfoFiles.push({
        input: buildInfoJson.input,
        output: buildInfoJson.output,
      });
    }
  }
  return buildInfoFiles;
}

function hasStorageLayoutSetting(buildInfoJson: any) {
  const o = buildInfoJson.input.settings?.outputSelection;
  return o && o['*'] && o['*']['*'] && (o['*']['*'].includes('storageLayout') || o['*']['*'].includes('*'));
}

async function readJSON(path: string) {
  return JSON.parse(await fs.readFile(path, 'utf8'));
}
