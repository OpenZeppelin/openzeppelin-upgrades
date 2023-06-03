import { SolcOutput, SolcInput } from '../..';

import { promises as fs } from 'fs';

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
 * Get the build info files from the given paths.
 *
 * @param buildInfoFilePaths Build info file paths.
 * @returns The build info files with Solidity compiler input and output.
 */
export async function getBuildInfoFiles(buildInfoFilePaths: string[]) {
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
