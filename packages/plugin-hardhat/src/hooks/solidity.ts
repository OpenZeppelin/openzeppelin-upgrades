import type { SolidityHooks } from 'hardhat/types/hooks';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { CompilationJob, CompilerInput, CompilerOutput } from 'hardhat/types/solidity';
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

/**
 * Wraps a compilation job so that it feeds solc a modified (namespaced) input while
 * reusing the original job's compiler version, settings, and dependency graph.
 *
 * Namespaced storage-layout validation needs a second compilation of source that has
 * been rewritten to expose namespaced struct members as ordinary storage variables.
 * We obtain that extra compilation through the build system's public `runCompilationJob`
 * method; this wrapper is how we hand it the modified input.
 *
 * The wrapper is a `Proxy` that forwards all member access to the original job and binds
 * any method we read back to that same instance. Hardhat's `CompilationJobImplementation`
 * keys its methods on `#`-private fields (`#hooks`, `#solcInput`, `#buildId`, …), so the
 * receiver inside a method call must remain the original instance — a plain `Object.create`
 * wrapper would only work as long as `runCompilationJob` happened not to invoke any such
 * method on the wrapper, which is a brittle contract to rely on across patch releases.
 */
function makeNamespacedCompilationJob(job: Readonly<CompilationJob>, namespacedInput: CompilerInput): CompilationJob {
  return new Proxy(job as CompilationJob, {
    get(target, prop, _receiver) {
      if (prop === 'getSolcInput') {
        return async (): Promise<CompilerInput> => namespacedInput;
      }
      const value = Reflect.get(target, prop, target);
      // Methods must run with `this === target` so that private-field access resolves on
      // the real instance the class was declared with.
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export default async (): Promise<Partial<SolidityHooks>> => {
  return {
    /**
     * Runs upgrade-safety validations against each compilation job's solc input/output and
     * writes the results to the validations cache, where the deploy/upgrade/validate helpers
     * read them. This is the interception point for validation: if it cannot produce complete
     * validation data the operation fails closed, because the helpers then find no cache.
     *
     * We hook `getCompilationJobErrors` rather than mutate the compiler error list: per its
     * contract we call `next` first and return that list unchanged, layering validation on top
     * as a side effect (and, when configured, throwing to abort the build).
     */
    async getCompilationJobErrors(context, compilationJob, compilerOutput, next) {
      // Compute the real error list first and never mutate it; this is the value the build
      // system uses to report errors, and the hook contract forbids altering it.
      const errors = await next(context, compilationJob, compilerOutput);

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

      const solcInput = await compilationJob.getSolcInput();
      const solcInputCore = toSolcInput(solcInput);
      const solcOutputCore = toSolcOutput(compilerOutput);

      // Only process full solc output (with contracts, sources, etc.)
      if (!isFullSolcOutput(solcOutputCore)) {
        return errors;
      }

      const solcVersion = compilationJob.solcConfig.version;
      const decodeSrc = solcInputOutputDecoder(solcInputCore, solcOutputCore);
      let namespacedOutput: SolcOutput | undefined = undefined;

      // Handle namespaced storage layouts. Solidity compile errors in the namespaced
      // output are surfaced through the `namespacedCompileErrors` setting below; any
      // other exception indicates an unexpected bug and is allowed to propagate rather
      // than silently dropping namespaced layout validation.
      if (isNamespaceSupported(solcVersion)) {
        let namespacedInput = makeNamespacedInput(solcInputCore, solcOutputCore, solcVersion);
        namespacedInput = await trySanitizeNatSpec(namespacedInput, solcVersion);

        // Run the namespaced compilation through the build system's public API. This compiles
        // the modified input with the same compiler version/settings without emitting artifacts,
        // and does not re-enter this hook.
        const namespacedJob = makeNamespacedCompilationJob(compilationJob, toCompilerInput(namespacedInput));
        const { output: namespacedResult } = await context.solidity.runCompilationJob(namespacedJob);

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
      }

      // Generate and write validations
      const validations = validate(solcOutputCore, decodeSrc, solcVersion, solcInputCore, namespacedOutput);
      await writeValidations(context as HardhatRuntimeEnvironment, validations);

      return errors;
    },

    /**
     * Post-processes artifacts after a successful build to bridge a Hardhat 3 gap for the
     * Foundry consumer: HH3 does not store AST in artifacts, so we inject it (and metadata)
     * from the split `.output.json` build-info files. This runs for the "contracts" scope only
     * (test artifacts are excluded by the build system), which is exactly the set the Foundry
     * upgrades plugin reads.
     */
    async processArtifactsAfterSuccessfulBuild(context, artifactPaths, _buildRootFilePaths, _buildOptions) {
      const path = await import('path');

      // Get the artifacts directory
      const artifactsDir = context.config.paths.artifacts;
      const buildInfoDir = path.join(artifactsDir, 'build-info');

      try {
        // Inject AST into artifact files for Hardhat 3 compatibility with Foundry plugin
        // In Hardhat 3, AST is stored in build-info output files, not in artifacts
        // The Foundry upgrades plugin expects AST in artifact files, so we inject it here
        debug('Starting AST injection into artifacts...');
        await injectAstIntoArtifacts([...artifactPaths], buildInfoDir);
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
 * by default, so this bridges the gap. Removing it breaks `examples/BoxSolidityTests`.
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
            skippedCount += 1;
          } else {
            // Log other errors but don't fail the whole process
            const message = err instanceof Error ? err.message : String(err);
            logWarning(`Could not inject AST into artifact ${artifactPath}: ${message}`);
            errorCount += 1;
          }
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
