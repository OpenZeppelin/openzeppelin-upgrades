// TODO: There are some AS ANY here, which I still need to test.
import type { SolidityHooks } from 'hardhat/types/hooks';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { CompilerOutput } from 'solc';
// Helper to extract compile errors from output
function getNamespacedCompileErrors(output: CompilerOutput | undefined): string[] {
  const errors: string[] = [];
  if (output?.errors) {
    for (const error of output.errors) {
      if (error.severity === 'error') {
        errors.push(error.formattedMessage || error.message);
      }
    }
  }
  return errors;
}

export default async (): Promise<Partial<SolidityHooks>> => {
  return {
    async preprocessSolcInputBeforeBuilding(context, solcInput, next) {
      // STARTING TO CONSIDER THAT THIS IS UNEEDED FOR NOW
      // const { readValidations, ValidationsCacheOutdated, ValidationsCacheNotFound } = await import(
      //   '../utils/validations.js'
      // );

      // try {
      //   await readValidations(context as HardhatRuntimeEnvironment);
      //   // Cache exists and is valid, continue normally
      // } catch (e) {
      //   if (e instanceof ValidationsCacheOutdated) {
      //     // Cache exists but is outdated - delete it
      //     // const fs = await import('fs/promises');

      //     // We shouldn't need to delete anything here, Hardhat will recompile changed contracts automatically
      //     // try {
      //     //   await fs.rm(context.config.paths.artifacts, { recursive: true, force: true });
      //     //   await fs.rm(context.config.paths.cache, { recursive: true, force: true });
      //     // } catch (err: any) {
      //     //   if (err.code !== 'ENOENT') {
      //     //     console.warn('⚠️  Could not delete cache:', err.message);
      //     //   }
      //     // }
      //   } else if (e instanceof ValidationsCacheNotFound) {
      //     // Cache doesn't exist - that's fine, just proceed with compilation
      //     // No need to delete anything!
      //   } else {
      //     throw e;
      //   }
      // }
      
      return await next(context, solcInput);
    },

    // TODO: enter in contact with Hardhat because there is no hook for post compile processing
    // have to yet review this.
    async onCleanUpArtifacts(context, artifactPaths, next) {
      await next(context, artifactPaths);

      const { validate, solcInputOutputDecoder, isNamespaceSupported, makeNamespacedInput, trySanitizeNatSpec } =
        await import('@openzeppelin/upgrades-core');
      const { writeValidations } = await import('../utils/validations.js');
      const { isFullSolcOutput } = await import('../utils/is-full-solc-output.js');
      const path = await import('path');
      const fs = await import('fs/promises');

      // Get the artifacts directory
      const artifactsDir = context.config.paths.artifacts;
      const buildInfoDir = path.join(artifactsDir, 'build-info');

      try {
        const buildInfoFiles = await fs.readdir(buildInfoDir);

        // Process each build-info file (each represents a compilation job)
        for (const file of buildInfoFiles) {
          
          // Skip output files - we only want to process input files
          if (!file.endsWith('.json') || file.endsWith('.output.json')) {
            continue;
          }

          const buildInfoPath = path.join(buildInfoDir, file);
          const buildInfoContent = await fs.readFile(buildInfoPath, 'utf-8');
          const buildInfo = JSON.parse(buildInfoContent);


          // Verify this is an input file
          if (buildInfo._format !== 'hh3-sol-build-info-1') {
            continue;
          }

          const { input, solcVersion } = buildInfo;

          // Skip if no solcVersion
          if (!solcVersion) {
            continue;
          }

          // Load the corresponding output file
          // Input file: abc123.json, Output file: abc123.output.json
          const outputFileName = file.replace('.json', '.output.json');
          const outputPath = path.join(buildInfoDir, outputFileName);

          let outputContent;
          try {
            outputContent = await fs.readFile(outputPath, 'utf-8');
          } catch (err: any) {
            if (err.code === 'ENOENT') {
              console.warn(`  ⚠️  Output file not found for ${file}, skipping`);
              continue;
            }
            throw err;
          }

          const outputBuildInfo = JSON.parse(outputContent);
          const output = outputBuildInfo.output;

          if (!isFullSolcOutput(output)) {
            continue;
          }

          const decodeSrc = solcInputOutputDecoder(input, output);
          let namespacedOutput: any = undefined;

          // Handle namespaced storage layouts
          if (isNamespaceSupported(solcVersion)) {
            try {
              let namespacedInput = makeNamespacedInput(input, output, solcVersion);
              namespacedInput = await trySanitizeNatSpec(namespacedInput, solcVersion);

              // Create a modified build info for namespaced compilation
              const namespacedBuildInfo = {
                ...buildInfo,
                input: namespacedInput,
              };

              // Run the namespaced compilation
              const namespacedResult = await context.solidity.compileBuildInfo(namespacedBuildInfo, { quiet: true });

              const namespacedCompileErrors = getNamespacedCompileErrors(namespacedResult);

              if (namespacedCompileErrors.length > 0) {
                const msg = `Failed to compile modified contracts for namespaced storage layout validations:\n\n${namespacedCompileErrors.join('\n')}`;
                const preamble = [
                  'Please report this at https://zpl.in/upgrades/report.',
                  'This step allows for advanced storage modifications with namespaced storage layouts.',
                ];

                const namespacedErrorsSetting = (context.config as any).namespacedCompileErrors;

                switch (namespacedErrorsSetting) {
                  case undefined:
                  case 'error': {
                    const { UpgradesError } = await import('@openzeppelin/upgrades-core');
                    const details = [
                      ...preamble,
                      'If you are not using namespaced storage, you can set namespacedCompileErrors: "warn" or "ignore" in your config.',
                    ];
                    throw new UpgradesError(msg, () => details.join('\n'));
                  }
                  case 'warn': {
                    const { logWarning } = await import('@openzeppelin/upgrades-core');
                    const details = [
                      ...preamble,
                      'Set namespacedCompileErrors: "ignore" in your config to suppress this warning.',
                    ];
                    logWarning(msg, details);
                    break;
                  }
                  case 'ignore':
                    break;
                }
                namespacedOutput = undefined;
              } else {
                namespacedOutput = namespacedResult;
              }
            } catch (err) {
              console.warn('⚠️  Failed to compile namespaced input:', err);
              namespacedOutput = undefined;
            }
          }
          // Generate and write validations
          const validations = validate(output as any, decodeSrc, solcVersion, input as any, namespacedOutput);

          await writeValidations(context as HardhatRuntimeEnvironment, validations);

        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    },
  };
};
