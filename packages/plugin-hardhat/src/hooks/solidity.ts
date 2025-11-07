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

let lockWarningShown = false;

export default async (): Promise<Partial<SolidityHooks>> => {
  return {
    async preprocessSolcInputBeforeBuilding(context, solcInput, next) {
      const { readValidations, ValidationsCacheOutdated, ValidationsCacheNotFound } = await import(
        '../utils/validations.js'
      );

      try {
        await readValidations(context as HardhatRuntimeEnvironment);
        // Cache exists and is valid, continue normally
      } catch (e) {
        if (e instanceof ValidationsCacheOutdated) {
          // Cache exists but is outdated 
          // TODO: when hardhat supports forcing recompilation, we should do it here
        } else if (e instanceof ValidationsCacheNotFound) {
          // Cache doesn't exist - that's fine, just proceed with compilation
        } else if (e.code === 'ELOCKED') {
          // Lock file is being held by another process - warn once and continue
          if (!lockWarningShown) {
            console.warn('\nWarning: Validations cache is locked by another process. Continuing without cache validation.');
            lockWarningShown = true;
          }
        } else {
          throw e;
        }
      }

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
          // TODO: review this part, maybe we are missing something from hardhat, namespaced.js tests are failing.
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
              // console.warn('⚠️  Failed to compile namespaced input', buildInfoPath);
              namespacedOutput = undefined;
            }
          }
          // Generate and write validations
          const validations = validate(output as any, decodeSrc, solcVersion, input as any, namespacedOutput);

          // Debug validations content (safer access)
          await writeValidations(context as HardhatRuntimeEnvironment, validations);

        }

        // Inject AST into artifact files for Hardhat 3 compatibility with Foundry plugin
        // In Hardhat 3, AST is stored in build-info output files, not in artifacts
        // The Foundry upgrades plugin expects AST in artifact files, so we inject it here
        await injectAstIntoArtifacts(artifactsDir, buildInfoDir);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    },
  };
};

/**
 * Injects AST from build-info output files into artifact files for Hardhat 3 compatibility.
 * This allows the Foundry upgrades plugin to find AST in artifact files as expected.
 */
async function injectAstIntoArtifacts(artifactsDir: string, buildInfoDir: string): Promise<void> {
  const path = await import('path');
  const fs = await import('fs/promises');

  // Recursively find all artifact JSON files
  async function findArtifactFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...(await findArtifactFiles(fullPath)));
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          files.push(fullPath);
        }
      }
    } catch (error: any) {
      // Ignore errors (e.g., directory doesn't exist)
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    return files;
  }

  const artifactFiles = await findArtifactFiles(path.join(artifactsDir, 'contracts'));

  for (const artifactPath of artifactFiles) {
    try {
      const artifactContent = await fs.readFile(artifactPath, 'utf-8');
      const artifact = JSON.parse(artifactContent);

      // Only process Hardhat 3 artifacts that have buildInfoId and inputSourceName
      // and don't already have AST
      if (
        artifact._format === 'hh3-artifact-1' &&
        artifact.buildInfoId &&
        artifact.inputSourceName &&
        !artifact.ast
      ) {
        // Read the corresponding build-info output file
        const buildInfoOutputPath = path.join(buildInfoDir, `${artifact.buildInfoId}.output.json`);

        try {
          const buildInfoOutputContent = await fs.readFile(buildInfoOutputPath, 'utf-8');
          const buildInfoOutput = JSON.parse(buildInfoOutputContent);

          // Extract AST from output.sources[inputSourceName].ast
          const inputSourceName = artifact.inputSourceName;
          const contractName = artifact.contractName;
          
          if (
            buildInfoOutput.output?.sources?.[inputSourceName]?.ast
          ) {
            const ast = buildInfoOutput.output.sources[inputSourceName].ast;

            // Inject AST into artifact
            artifact.ast = ast;

            // Also inject metadata if it's missing (needed for Foundry plugin)
            // Metadata is stored in output.contracts[inputSourceName][contractName].metadata
            // Metadata is a JSON string, but we need to parse it to an object for the Foundry plugin
            if (!artifact.metadata && buildInfoOutput.output?.contracts?.[inputSourceName]?.[contractName]?.metadata) {
              const metadataString = buildInfoOutput.output.contracts[inputSourceName][contractName].metadata;
              try {
                // Parse the metadata JSON string to an object
                artifact.metadata = JSON.parse(metadataString);
              } catch (err) {
                // If parsing fails, store as string (fallback)
                artifact.metadata = metadataString;
              }
            }

            // Write the updated artifact back
            await fs.writeFile(artifactPath, JSON.stringify(artifact, null, 2), 'utf-8');
          }
        } catch (err: any) {
          // If build-info output file doesn't exist or AST is missing, skip this artifact
          if (err.code !== 'ENOENT') {
            // Log other errors but don't fail the whole process
            console.warn(`Warning: Could not inject AST into artifact ${artifactPath}: ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      // If artifact file is invalid JSON or can't be read, skip it
      if (err.code !== 'ENOENT') {
        console.warn(`Warning: Could not process artifact ${artifactPath}: ${err.message}`);
      }
    }
  }
}
