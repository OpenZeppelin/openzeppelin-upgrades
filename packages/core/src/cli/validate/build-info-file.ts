import { SolcOutput, SolcInput } from '../..';

import { promises as fs } from 'fs';
import path from 'path';

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
  const dir = buildInfoDir ?? (await findDefaultDir());
  const jsonFiles = await getJsonFiles(dir);
  return await readBuildInfo(jsonFiles);
}

async function findDefaultDir() {
  const hardhatDir = path.join(process.cwd(), 'artifacts', 'build-info');
  const foundryDir = path.join(process.cwd(), 'out', 'build-info');

  const hardhatDirExists = await checkDirExists(hardhatDir);
  const foundryDirExists = await checkDirExists(foundryDir);

  if (hardhatDirExists && foundryDirExists) {
    throw new Error(
      `Found both Hardhat and Foundry build-info directories in '${hardhatDir}' and '${foundryDir}'. Specify the build-info directory to validate.`,
    );
  } else if (hardhatDirExists) {
    return hardhatDir;
  } else {
    return foundryDir;
  }
}

async function checkDirExists(dir: string) {
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
      buildInfoFiles.push({
        input: buildInfoJson.input,
        output: buildInfoJson.output,
      });
    }
  }
  return buildInfoFiles;
}

async function readJSON(path: string) {
  return JSON.parse(await fs.readFile(path, 'utf8'));
}
