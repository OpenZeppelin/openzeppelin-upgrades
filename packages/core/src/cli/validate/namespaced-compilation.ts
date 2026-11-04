import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import lockfile from 'proper-lockfile';

import { SolcOutput } from '../../solc-api';
import { StorageItem, StorageOperation } from '../../storage/compare';
import { isNamespaceSupported } from '../../storage/namespace';
import { makeNamespacedInput, trySanitizeNatSpec } from '../../utils/make-namespaced';
import debug from '../../utils/debug';
import { BuildInfoFile, remapKeys } from './build-info-file';
import { ProjectReport } from './project-report';

const SOLC_BINARIES_URL = 'https://binaries.soliditylang.org/emscripten-wasm32';
const DOWNLOAD_TIMEOUT_MS = 300_000;

const REPORT_ISSUE_HINT =
  'Please report this at https://zpl.in/upgrades/report and include the source code for the contracts mentioned in the errors above';

/**
 * Thrown when the namespaced compilation cannot be run, because the compiler cannot be obtained or reports errors.
 * The message says why, and the hint says what the user can do about it.
 */
export class NamespacedCompilationUnavailableError extends Error {
  constructor(
    message: string,
    readonly hint: string,
  ) {
    super(message);
  }
}

/**
 * Whether the report failed only because of storage layout errors in namespaced storage.
 */
export function needsNamespacedLayouts(report: ProjectReport): boolean {
  const failed = report.upgradeableContractReports.filter(r => !r.ok);
  return (
    failed.length > 0 &&
    failed.every(r => r.standaloneReport.ok && r.storageLayoutReport?.ops.every(isNamespacedStorageError))
  );
}

function isNamespacedStorageError(op: StorageOperation<StorageItem>): boolean {
  if (op.kind === 'delete-namespace') {
    return true;
  }
  return inferIsNamespaceMember('updated' in op ? op.updated : op.original);
}

/**
 * Infers whether a field is a namespace member from whether it has a storage slot. The CLI requires storage layouts
 * in the compiler output, so regular state variables always have slots, but namespace members only get them from a
 * namespaced compilation.
 */
function inferIsNamespaceMember(field: StorageItem): boolean {
  return field.slot === undefined;
}

/**
 * Adds the output of a namespaced compilation to each build info file that has namespaces.
 *
 * @throws NamespacedCompilationUnavailableError if a namespaced compilation cannot be run.
 */
export async function withNamespacedOutputs(buildInfoFiles: BuildInfoFile[]): Promise<BuildInfoFile[]> {
  const result: BuildInfoFile[] = [];
  for (const buildInfoFile of buildInfoFiles) {
    if (hasNamespaces(buildInfoFile)) {
      result.push({ ...buildInfoFile, namespacedOutput: await getNamespacedOutput(buildInfoFile) });
    } else {
      result.push(buildInfoFile);
    }
  }
  return result;
}

function hasNamespaces({ input, solcVersion }: BuildInfoFile): boolean {
  return (
    isNamespaceSupported(solcVersion) &&
    Object.values(input.sources).some(source => source.content?.match(/@custom:storage-location/))
  );
}

/**
 * Runs the namespaced compilation for a build info file: the same modified compiler input that Hardhat Upgrades
 * compiles, compiled with the official release of the build info file's solc version.
 *
 * @throws NamespacedCompilationUnavailableError if the compiler cannot be obtained or reports errors.
 */
export async function getNamespacedOutput(buildInfoFile: BuildInfoFile): Promise<SolcOutput> {
  const { input, output, solcVersion, userSourceNameMap } = buildInfoFile;
  const namespacedInput = await trySanitizeNatSpec(makeNamespacedInput(input, output, solcVersion), solcVersion);

  // Compiler inputs of Hardhat 3 refer to sources by their canonical names, which also determine the source ids
  const sources =
    userSourceNameMap === undefined ? namespacedInput.sources : remapKeys(namespacedInput.sources, userSourceNameMap);
  // Only the standard JSON input fields, since the build info input from Foundry also has fields that solc rejects
  const standardJsonInput = { language: 'Solidity', sources, settings: namespacedInput.settings };

  const solc = await getSolc(solcVersion);
  let namespacedOutput: SolcOutput;
  try {
    namespacedOutput = JSON.parse(solc.compile(JSON.stringify(standardJsonInput)));
  } catch (e) {
    throw new NamespacedCompilationUnavailableError(
      `Compiling the contracts to get their detailed storage layout failed: ${errorMessage(e)}`,
      REPORT_ISSUE_HINT,
    );
  }

  const errors = (namespacedOutput.errors ?? []).filter(e => e.severity === 'error');
  if (errors.length > 0) {
    throw new NamespacedCompilationUnavailableError(
      `Compiling the contracts to get their detailed storage layout failed:\n\n${errors.map(e => e.formattedMessage).join('\n')}`,
      REPORT_ISSUE_HINT,
    );
  }

  if (userSourceNameMap === undefined) {
    return namespacedOutput;
  }
  const canonicalToUser = Object.fromEntries(
    Object.entries(userSourceNameMap).map(([userSourceName, canonicalSourceName]) => [
      canonicalSourceName,
      userSourceName,
    ]),
  );
  return {
    ...namespacedOutput,
    sources: remapKeys(namespacedOutput.sources, canonicalToUser),
    contracts: remapKeys(namespacedOutput.contracts, canonicalToUser),
  };
}

interface Solc {
  version(): string;
  compile(input: string): string;
}

/**
 * The wasm build of solc, which turns the functions it exports into JavaScript functions with `cwrap`. Only the
 * functions that are used are declared, each with its argument and return types.
 */
interface Soljson {
  cwrap(name: 'solidity_version', returnType: 'string', argTypes: []): () => string;
  cwrap(
    name: 'solidity_compile',
    returnType: 'string',
    argTypes: ['string', 'number', 'number'],
  ): (input: string, readCallback: number, context: number) => string;
  cwrap(name: 'solidity_reset', returnType: null, argTypes: []): () => void;
}

async function getSolc(version: string): Promise<Solc> {
  const file = await getSolcFile(version);
  const notLoaded = (reason: string) =>
    new NamespacedCompilationUnavailableError(
      `The Solidity compiler at ${file} could not be loaded: ${reason}`,
      `Delete ${file}, then run the validation again`,
    );

  let solc: Solc;
  let loadedVersion: string;
  try {
    const soljson: Soljson = (await import(pathToFileURL(file).href)).default;
    solc = wrapSoljson(soljson);
    loadedVersion = solc.version();
  } catch (e) {
    throw notLoaded(errorMessage(e));
  }
  if (!loadedVersion.startsWith(`${version}+commit`)) {
    throw notLoaded(`expected solc ${version}, but found solc ${loadedVersion}`);
  }
  return solc;
}

/**
 * Calls the functions that the wasm build of solc exports for compiling standard JSON input. Namespaces require solc
 * 0.8.20 or later, so only the functions of those versions are needed.
 */
function wrapSoljson(soljson: Soljson): Solc {
  const version = soljson.cwrap('solidity_version', 'string', []);
  const compile = soljson.cwrap('solidity_compile', 'string', ['string', 'number', 'number']);
  const reset = soljson.cwrap('solidity_reset', null, []);

  return {
    version,
    compile: input => {
      try {
        // No callback for reading files, since the input has the content of every source
        return compile(input, 0, 0);
      } finally {
        // Frees the memory that the compiler allocated. The output has already been copied into a JavaScript string.
        reset();
      }
    },
  };
}

let solcCacheDirForTesting: string | undefined;

/**
 * Sets the directory for downloaded compilers, instead of the one in the user's cache directory. Only for tests.
 */
export function setSolcCacheDirForTesting(dir: string | undefined): void {
  solcCacheDirForTesting = dir;
}

/**
 * The directory in the user's cache directory where downloaded compilers are kept.
 */
export async function getSolcCacheDir(): Promise<string> {
  if (solcCacheDirForTesting !== undefined) {
    return solcCacheDirForTesting;
  }
  // Loaded only when needed, since loading it reads the home directory, which fails if there is none
  const { default: envPaths } = await import('env-paths');
  return path.join(envPaths('openzeppelin-upgrades').cache, 'solc');
}

/**
 * Gets the path of the wasm build of a solc release in the cache, downloading it first if it is not there. A download
 * is only cached if it matches the sha256 checksum in the list of official releases.
 *
 * @throws NamespacedCompilationUnavailableError if the compiler cannot be downloaded or saved.
 */
export async function getSolcFile(version: string): Promise<string> {
  let dir: string | undefined;
  try {
    dir = await getSolcCacheDir();
    // Always loaded as CommonJS, whatever the package type of the directories above
    const file = path.join(dir, `soljson-v${version}.cjs`);
    if (await exists(file)) {
      return file;
    }

    await fs.mkdir(dir, { recursive: true });
    // Only one process downloads a given version at a time, and the others wait for longer than its two requests can
    // take. The lock is only there to avoid duplicate downloads, since each download is checked before it is moved into
    // place, so a lock that another process took over is not an error.
    const release = await lockfile.lock(file, {
      realpath: false,
      retries: { retries: (2 * DOWNLOAD_TIMEOUT_MS) / 1000 + 60, minTimeout: 1000, maxTimeout: 1000 },
      onCompromised: () => {},
    });
    try {
      if (!(await exists(file))) {
        const bytes = await downloadSolc(version);
        // Write to a temporary file and rename it, so that the cache never has a partially written compiler
        const tempFile = `${file}.${process.pid}.tmp`;
        await fs.writeFile(tempFile, bytes);
        await fs.rename(tempFile, file);
      }
    } finally {
      await release();
    }
    return file;
  } catch (e) {
    if (e instanceof NamespacedCompilationUnavailableError) {
      throw e;
    }
    const folder = dir ?? 'the cache folder';
    throw new NamespacedCompilationUnavailableError(
      `The Solidity compiler could not be saved in ${folder}: ${errorMessage(e)}`,
      `Make sure ${folder} can be written, then run the validation again`,
    );
  }
}

/**
 * Downloads the wasm build of a solc release, and checks it against its sha256 checksum in the list of releases.
 *
 * @throws NamespacedCompilationUnavailableError if the compiler cannot be downloaded.
 */
async function downloadSolc(version: string): Promise<Buffer> {
  debug(`Downloading solc ${version} to check namespaced storage with a detailed storage layout`);
  try {
    const list = (await (await fetchUrl(`${SOLC_BINARIES_URL}/list.json`)).json()) as {
      releases?: Record<string, string>;
      builds?: { path: string; sha256: string }[];
    };
    const fileName = list.releases?.[version];
    const build = list.builds?.find(b => b.path === fileName);
    if (fileName === undefined || build === undefined) {
      throw new NamespacedCompilationUnavailableError(
        `Solidity compiler version ${version} is not a release listed at binaries.soliditylang.org`,
        'Compile the contracts with a released version of solc, then run the validation again',
      );
    }

    const bytes = Buffer.from(await (await fetchUrl(`${SOLC_BINARIES_URL}/${fileName}`)).arrayBuffer());
    const sha256 = `0x${crypto.createHash('sha256').update(bytes).digest('hex')}`;
    if (sha256 !== build.sha256) {
      throw new Error(`${fileName} does not match its sha256 checksum`);
    }
    return bytes;
  } catch (e) {
    if (e instanceof NamespacedCompilationUnavailableError) {
      throw e;
    }
    throw new NamespacedCompilationUnavailableError(
      `The Solidity compiler could not be downloaded from binaries.soliditylang.org: ${errorMessage(e)}`,
      'Make sure binaries.soliditylang.org can be reached, then run the validation again',
    );
  }
}

async function fetchUrl(url: string): Promise<Response> {
  // With a timeout, since a download that never finishes would otherwise wait forever
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP status ${response.status}`);
  }
  return response;
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function errorMessage(e: unknown): string {
  if (!(e instanceof Error)) {
    return String(e);
  }
  // fetch reports network errors as "fetch failed", with the reason in the cause
  const cause = (e as { cause?: unknown }).cause;
  return cause instanceof Error ? `${e.message} (${cause.message})` : e.message;
}
