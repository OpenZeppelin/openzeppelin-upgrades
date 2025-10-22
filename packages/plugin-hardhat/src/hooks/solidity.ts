import type { SolidityHooks } from 'hardhat/types/hooks';
import type { SolcInput, SolcOutput } from '@openzeppelin/upgrades-core';
import hre from 'hardhat';

interface CompilationResult {
  input: SolcInput;
  output: SolcOutput;
  solcVersion: string;
}

export default async (): Promise<Partial<SolidityHooks>> => {
  return {
    async preprocessSolcInputBeforeBuilding(context, solcInput, next) {
      const { readValidations, ValidationsCacheOutdated, ValidationsCacheNotFound } = await import(
        '../utils/validations.js'
      );

      try {
        await readValidations(hre);
      } catch (e) {
        if (e instanceof ValidationsCacheOutdated || e instanceof ValidationsCacheNotFound) {
          // Force recompilation if validations cache is outdated
          // Note: In Hardhat 3, we may need to handle forceCompile differently
          // context.forceCompile = true;
        } else {
          throw e;
        }
      }

      return await next(context, solcInput);
    },

    async onCleanUpArtifacts(context, artifactPaths, next) {
      await next(context, artifactPaths);
      
      const { validate, solcInputOutputDecoder } = await import('@openzeppelin/upgrades-core');
      const { writeValidations } = await import('../utils/validations.js');
      const { isFullSolcOutput } = await import('../utils/is-full-solc-output.js');
      const path = await import('path');
      const fs = await import('fs/promises');
      
      // Get the artifacts directory from HRE config
      const artifactsDir = hre.config.paths.artifacts;
      const buildInfoDir = path.join(artifactsDir, 'build-info');
      
      try {
        // Read all build-info files
        const buildInfoFiles = await fs.readdir(buildInfoDir);
        
        for (const file of buildInfoFiles) {
          if (!file.endsWith('.json')) continue;
          
          const buildInfoPath = path.join(buildInfoDir, file);
          const buildInfoContent = await fs.readFile(buildInfoPath, 'utf-8');
          const buildInfo = JSON.parse(buildInfoContent);
          
          const { input, output, solcVersion } = buildInfo;
          
          if (isFullSolcOutput(output)) {
            const decodeSrc = solcInputOutputDecoder(input, output);
            const validations = validate(output, decodeSrc, solcVersion, input);
            await writeValidations(hre, validations);
          }
        }
      } catch (error: any) {
        // Handle cases where build-info directory doesn't exist yet
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    },
  };
};
