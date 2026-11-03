import test from 'ava';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { rimraf } from 'rimraf';

import {
  getSolcCacheDir,
  getSolcFile,
  NamespacedCompilationUnavailableError,
  setSolcCacheDirForTesting,
} from './namespaced-compilation';
import SOLIDITY_VERSION from '../../solidity-version.json';

const LIST_URL = 'https://binaries.soliditylang.org/emscripten-wasm32/list.json';
const FILE_NAME = 'solc-emscripten-wasm32-v0.8.29+commit.ab55807c.js';
const FILE_URL = `https://binaries.soliditylang.org/emscripten-wasm32/${FILE_NAME}`;

// Use a pinned compiler version for test contracts, since the CLI only uses the compiler of the build info's version
const BUNDLED_SOLJSON = require.resolve('solc-0.8.29/soljson.js');

const originalFetch = globalThis.fetch;
let fetchCalls: string[];
let tempDir: string | undefined;
let cacheDir: string;

function stubFetch(responses: Record<string, () => Response>) {
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = input.toString();
    fetchCalls.push(url);
    const response = responses[url];
    if (response === undefined) {
      throw new Error(`Unexpected request to ${url}`);
    }
    return response();
  };
}

async function getBundledSoljson() {
  const bytes = await fs.readFile(BUNDLED_SOLJSON);
  return { bytes, sha256: `0x${crypto.createHash('sha256').update(bytes).digest('hex')}` };
}

function list(sha256: string) {
  return () =>
    new Response(JSON.stringify({ releases: { '0.8.29': FILE_NAME }, builds: [{ path: FILE_NAME, sha256 }] }));
}

test.before(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-'));
  process.chdir(tempDir);
  cacheDir = path.join(tempDir, 'solc-cache');
  setSolcCacheDirForTesting(cacheDir);
});

test.beforeEach(async () => {
  fetchCalls = [];
  stubFetch({});
  await rimraf(cacheDir);
});

test.after.always(async () => {
  globalThis.fetch = originalFetch;
  setSolcCacheDirForTesting(undefined);
  // This also runs if the setup failed, so the current folder may not be the temporary folder
  if (tempDir !== undefined) {
    await rimraf(tempDir);
  }
});

test('solc dev dependency is the version of the test contracts', async t => {
  const solcPackage = JSON.parse(await fs.readFile(require.resolve('solc-0.8.29/package.json'), 'utf8'));
  t.is(solcPackage.version, SOLIDITY_VERSION);
});

test.serial('downloads, checks and caches the compiler', async t => {
  const { bytes, sha256 } = await getBundledSoljson();
  stubFetch({ [LIST_URL]: list(sha256), [FILE_URL]: () => new Response(bytes) });

  const file = await getSolcFile('0.8.29');

  t.is(file, path.join(await getSolcCacheDir(), 'soljson-v0.8.29.cjs'));
  t.deepEqual(await fs.readFile(file), bytes);
  t.deepEqual(fetchCalls, [LIST_URL, FILE_URL]);
});

test.serial('uses the cached compiler without network access', async t => {
  await fs.mkdir(await getSolcCacheDir(), { recursive: true });
  await fs.copyFile(BUNDLED_SOLJSON, path.join(await getSolcCacheDir(), 'soljson-v0.8.29.cjs'));

  const file = await getSolcFile('0.8.29');

  t.is(file, path.join(await getSolcCacheDir(), 'soljson-v0.8.29.cjs'));
  t.deepEqual(fetchCalls, []);
});

test.serial('rejects a download that does not match its checksum', async t => {
  const { bytes } = await getBundledSoljson();
  stubFetch({ [LIST_URL]: list(`0x${'0'.repeat(64)}`), [FILE_URL]: () => new Response(bytes) });

  const error = await t.throwsAsync(getSolcFile('0.8.29'), { instanceOf: NamespacedCompilationUnavailableError });

  t.true(error?.message.includes('sha256'), error?.message);
  t.deepEqual(await fs.readdir(await getSolcCacheDir()).catch(() => []), []);
});

test.serial('rejects a version that is not a release', async t => {
  const { sha256 } = await getBundledSoljson();
  stubFetch({ [LIST_URL]: list(sha256) });

  const error = await t.throwsAsync(getSolcFile('0.8.99'), { instanceOf: NamespacedCompilationUnavailableError });

  t.true(error?.message.includes('0.8.99'), error?.message);
  t.deepEqual(fetchCalls, [LIST_URL]);
});

test.serial('reports network failures as an unavailable compiler', async t => {
  const error = await t.throwsAsync(getSolcFile('0.8.29'), { instanceOf: NamespacedCompilationUnavailableError });

  t.true(error?.message.includes(`Unexpected request to ${LIST_URL}`), error?.message);
});

test.serial('reports HTTP errors as an unavailable compiler', async t => {
  stubFetch({ [LIST_URL]: () => new Response('Not Found', { status: 404 }) });

  const error = await t.throwsAsync(getSolcFile('0.8.29'), { instanceOf: NamespacedCompilationUnavailableError });

  t.true(error?.message.includes(`${LIST_URL} returned HTTP status 404`), error?.message);
});
