import type { SolidityHooks, HookContext } from 'hardhat/types/hooks';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { SolcConfig } from 'hardhat/types/config';
import type { CompilerInput, CompilerOutput, Compiler } from 'hardhat/types/solidity';
import type { SolcInput, SolcOutput } from '@openzeppelin/upgrades-core';
import { logWarning } from '@openzeppelin/upgrades-core';
import debug from '../utils/debug.js';

// Helper to extract compile errors from output
function getNamespacedCompileErrors(output: CompilerOutput | undefined): string[] {
  const errors: string[] = [];
  if (output?.errors) {
    for (const error of output.errors) {
      if (error.severity === 'error') {
        errors.push(error.formattedMessage ?? error.message);
      }
    }
  }
  return errors;
}

let lockWarningShown = false;

/**
 * Converts Hardhat's CompilerInput to upgrades-core's SolcInput.
 * The types are structurally compatible for the fields we use.
 */
function toSolcInput(input: CompilerInput): SolcInput {
  return input as unknown as SolcInput;
}

/**
 * Converts Hardhat's CompilerOutput to upgrades-core's SolcOutput.
 * The types are structurally compatible for the fields we use.
 */
function toSolcOutput(output: CompilerOutput): SolcOutput {
  return output as unknown as SolcOutput;
}

/**
 * Converts upgrades-core's SolcInput to Hardhat's CompilerInput.
 */
function toCompilerInput(input: SolcInput): CompilerInput {
  return input as unknown as CompilerInput;
}

export default async (): Promise<Partial<SolidityHooks>> => {
  return {
    async preprocessSolcInputBeforeBuilding(context, solcInput, next) {
      const { readValidations, ValidationsCacheOutdated, ValidationsCacheNotFound } = await import(
        '../utils/validations.js'
      );
      const { isErrorCode } = await import('../utils/errors.js');

      try {
        await readValidations(context as HardhatRuntimeEnvironment);
        // Cache exists and is valid, continue normally
      } catch (e: unknown) {
        if (e instanceof ValidationsCacheOutdated) {
          // Cache exists but is outdated. The compile-task override (see
          // compile-task-action.ts) already detected this and forced a full
          // recompile, so invokeSolc will regenerate the cache.
        } else if (e instanceof ValidationsCacheNotFound) {
          // Cache doesn't exist - that's fine, just proceed with compilation
        } else if (isErrorCode(e, 'ELOCKED')) {
          // Lock file is being held by another process - warn once and continue
          if (!lockWarningShown) {
            logWarning('Validations cache is locked by another process.', ['Continuing without cache validation.']);
            lockWarningShown = true;
          }
        } else {
          throw e;
        }
      }

      return await next(context, solcInput);
    },

    /**
     * Hook that intercepts solc invocation to run upgrade validations.
     * This replaces the old workaround of reading build-info files in onCleanUpArtifacts.
     */
    async invokeSolc(
      context: HookContext,
      compiler: Compiler,
      solcInput: CompilerInput,
      solcConfig: SolcConfig,
      next: (
        nextContext: HookContext,
        nextCompiler: Compiler,
        nextSolcInput: CompilerInput,
        nextSolcConfig: SolcConfig,
      ) => Promise<CompilerOutput>,
    ): Promise<CompilerOutput> {
      const {
        validate,
        solcInputOutputDecoder,
        isNamespaceSupported,
        makeNamespacedInput,
        trySanitizeNatSpec,
        assertUnreachable,
      } = await import('@openzeppelin/upgrades-core');
      const { writeValidations } = await import('../utils/validations.js');
      const { isFullSolcOutput } = await import('../utils/is-full-solc-output.js');

      // Run the original compilation
      const output = await next(context, compiler, solcInput, solcConfig);

      // Convert to upgrades-core types for validation
      const solcInputCore = toSolcInput(solcInput);
      const solcOutputCore = toSolcOutput(output);

      // Only process full solc output (with contracts, sources, etc.)
      if (!isFullSolcOutput(solcOutputCore)) {
        return output;
      }

      const solcVersion = compiler.version;
      const decodeSrc = solcInputOutputDecoder(solcInputCore, solcOutputCore);
      let namespacedOutput: SolcOutput | undefined = undefined;

      // Handle namespaced storage layouts
      if (isNamespaceSupported(solcVersion)) {
        try {
          let namespacedInput = makeNamespacedInput(solcInputCore, solcOutputCore, solcVersion);
          namespacedInput = await trySanitizeNatSpec(namespacedInput, solcVersion);

          // Run the namespaced compilation by calling next() with modified input
          const namespacedResult = await next(context, compiler, toCompilerInput(namespacedInput), solcConfig);

          const namespacedCompileErrors = getNamespacedCompileErrors(namespacedResult);

          if (namespacedCompileErrors.length > 0) {
            const msg = `Failed to compile modified contracts for namespaced storage layout validations:\n\n${namespacedCompileErrors.join('\n')}`;
            const preamble = [
              'Please report this at https://zpl.in/upgrades/report.',
              'If possible, include the source code for the contracts mentioned in the errors above.',
              'This step allows for advanced storage modifications such as tight variable packing when performing upgrades with namespaced storage layouts.',
            ];

            const namespacedErrorsSetting = (
              context.config as HardhatRuntimeEnvironment['config'] & {
                namespacedCompileErrors?: 'error' | 'warn' | 'ignore';
              }
            ).namespacedCompileErrors;

            switch (namespacedErrorsSetting) {
              case undefined:
              case 'error': {
                const { UpgradesError } = await import('@openzeppelin/upgrades-core');
                const details = [
                  ...preamble,
                  'If you are not using namespaced storage, or if you do not anticipate making advanced modifications to namespaces during upgrades,',
                  "you can set namespacedCompileErrors: 'warn' or namespacedCompileErrors: 'ignore' in your hardhat config to convert this to a warning or to ignore this.",
                ];
                throw new UpgradesError(msg, () => details.join('\n'));
              }
              case 'warn': {
                const details = [
                  ...preamble,
                  "you can set namespacedCompileErrors: 'ignore' in your hardhat config to ignore this.",
                ];
                logWarning(msg, details);
                break;
              }
              case 'ignore':
                break;
              default:
                assertUnreachable(namespacedErrorsSetting);
            }
            namespacedOutput = undefined;
          } else {
            namespacedOutput = toSolcOutput(namespacedResult);
          }
        } catch (err: unknown) {
          // If it's an UpgradesError, rethrow it
          const { UpgradesError } = await import('@openzeppelin/upgrades-core');
          if (err instanceof UpgradesError) {
            throw err;
          }
          // Otherwise, silently continue without namespaced output
          namespacedOutput = undefined;
        }
      }

      // Generate and write validations
      const validations = validate(solcOutputCore, decodeSrc, solcVersion, solcInputCore, namespacedOutput);
      await writeValidations(context as HardhatRuntimeEnvironment, validations);

      return output;
    },

    /**
     * Hook for cleanup - only handles AST injection for Foundry plugin compatibility.
     * Validation logic has been moved to invokeSolc hook.
     */
    async onCleanUpArtifacts(context, artifactPaths, next) {
      await next(context, artifactPaths);

      const path = await import('path');

      // Get the artifacts directory
      const artifactsDir = context.config.paths.artifacts;
      const buildInfoDir = path.join(artifactsDir, 'build-info');

      try {
        // Inject AST into artifact files for Hardhat 3 compatibility with Foundry plugin
        // In Hardhat 3, AST is stored in build-info output files, not in artifacts
        // The Foundry upgrades plugin expects AST in artifact files, so we inject it here
        debug('Starting AST injection into artifacts...');
        await injectAstIntoArtifacts(artifactPaths, buildInfoDir);
      } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code !== 'ENOENT') {
          throw error;
        }
      }
    },
  };
};

/**
 * Injects AST and metadata from HH3's split `.output.json` build-info files into artifact JSON.
 *
 * Required by the `@openzeppelin/foundry-upgrades` npm package, which reads this data from
 * artifacts via FFI during `hardhat test solidity`. HH3's artifact schema does not include AST
 * by default, so this hook bridges the gap. Removing it breaks `examples/BoxSolidityTests`.
 */
export async function injectAstIntoArtifacts(artifactPaths: string[], buildInfoDir: string): Promise<void> {
  const path = await import('path');
  const fs = await import('fs/promises');

  const artifactFiles = artifactPaths.filter(p => p.endsWith('.json'));
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const artifactPath of artifactFiles) {
    try {
      const artifactContent = await fs.readFile(artifactPath, 'utf-8');
      const artifact = JSON.parse(artifactContent);

      // Only process Hardhat 3 artifacts that have buildInfoId and inputSourceName
      // and don't already have AST
      // Skip artifacts without buildInfoId (they may not be fully processed yet)
      if (artifact._format === 'hh3-artifact-1' && artifact.buildInfoId && artifact.inputSourceName && !artifact.ast) {
        // Read the corresponding build-info output file
        const buildInfoOutputPath = path.join(buildInfoDir, `${artifact.buildInfoId}.output.json`);

        try {
          const buildInfoOutputContent = await fs.readFile(buildInfoOutputPath, 'utf-8');
          const buildInfoOutput = JSON.parse(buildInfoOutputContent);

          // Extract AST from output.sources[inputSourceName].ast
          const inputSourceName = artifact.inputSourceName;
          const contractName = artifact.contractName;

          if (buildInfoOutput.output?.sources?.[inputSourceName]?.ast) {
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
              } catch {
                // If parsing fails, store as string (fallback)
                artifact.metadata = metadataString;
              }
            }

            // Write the updated artifact back
            await fs.writeFile(artifactPath, JSON.stringify(artifact, null, 2), 'utf-8');
            processedCount += 1;
          } else {
            // AST not found in build-info - log for debugging
            logWarning(`AST not found in build-info for artifact ${artifactPath}`, [
              `buildInfoId: ${artifact.buildInfoId}`,
              `inputSourceName: ${inputSourceName}`,
              `build-info output exists: ${!!buildInfoOutput.output}`,
              `sources exists: ${!!buildInfoOutput.output?.sources}`,
              `source key exists: ${!!buildInfoOutput.output?.sources?.[inputSourceName]}`,
            ]);
            skippedCount += 1;
          }
        } catch (err: unknown) {
          // If build-info output file doesn't exist or AST is missing, skip this artifact
          const isEnoent = typeof err === 'object' && err !== null && 'code' in err && err.code === 'ENOENT';
          if (isEnoent) {
            logWarning(`Build-info output file not found for artifact ${artifactPath}`, [
              `Expected: ${buildInfoOutputPath}`,
              `buildInfoId: ${artifact.buildInfoId}`,
            ]);
          } else {
            // Log other errors but don't fail the whole process
            const message = err instanceof Error ? err.message : String(err);
            logWarning(`Could not inject AST into artifact ${artifactPath}: ${message}`);
            errorCount += 1;
          }
          skippedCount += 1;
        }
      }
    } catch (err: unknown) {
      // If artifact file is invalid JSON or can't be read, skip it
      const isEnoent = typeof err === 'object' && err !== null && 'code' in err && err.code === 'ENOENT';
      if (!isEnoent) {
        const message = err instanceof Error ? err.message : String(err);
        logWarning(`Could not process artifact ${artifactPath}: ${message}`);
        errorCount += 1;
      }
    }
  }

  // Log summary if any artifacts were processed or had issues
  if (processedCount > 0 || skippedCount > 0 || errorCount > 0) {
    debug(`AST injection: ${processedCount} processed, ${skippedCount} skipped, ${errorCount} errors`);
  }
}
