import type { SolidityHooks } from 'hardhat/types/hooks';
import type { SolcInput, SolcOutput } from '@openzeppelin/upgrades-core';

interface CompilationResult {
  input: SolcInput;
  output: SolcOutput;
  solcVersion: string;
}

export default async (): Promise<Partial<SolidityHooks>> => {
  return {
    async beforeCompile(context, next) {
      const { readValidations, ValidationsCacheOutdated, ValidationsCacheNotFound } = await import(
        '../utils/validations.js'
      );

      try {
        await readValidations(context.hre);
      } catch (e) {
        if (e instanceof ValidationsCacheOutdated || e instanceof ValidationsCacheNotFound) {
          // Force recompilation if validations cache is outdated
          context.forceCompile = true;
        } else {
          throw e;
        }
      }

      return next(context);
    },

    async afterCompilationJob(context, next) {
      const result = await next(context) as CompilationResult;
      
      const { validate, solcInputOutputDecoder } = await import('@openzeppelin/upgrades-core');
      const { writeValidations } = await import('../utils/validations.js');
      const { isFullSolcOutput } = await import('../utils/is-full-solc-output.js');

      const { input, output, solcVersion } = result;
      
      if (isFullSolcOutput(output)) {
        const decodeSrc = solcInputOutputDecoder(input, output);
        
        // For now, skip namespaced validation until we have proper compiler access in hooks
        // The original implementation called runSuper() again, which isn't available in hooks
        const validations = validate(output, decodeSrc, solcVersion, input);
        await writeValidations(context.hre, validations);
      }

      return result;
    },
  };
};
