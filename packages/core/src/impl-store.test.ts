import test from 'ava';

import { promises as fs } from 'fs';
import rimrafAsync from 'rimraf';
import util from 'util';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

import { Deployment } from './manifest';
import { fetchOrDeploy } from './impl-store';

const rimraf = util.promisify(rimrafAsync);

test.before(async () => {
  process.chdir(await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-')));
});

test.after(async () => {
  await rimraf(process.cwd());
});

test('deploys on cache miss', async t => {
  const provider = stubProvider();
  await fetchOrDeploy('version1', provider, provider.deploy);
  t.is(provider.deployCount, 1);
});

test('reuses on cache hit', async t => {
  const provider = stubProvider();
  const cachedDeploy = () => fetchOrDeploy('version1', provider, provider.deploy);
  const address1 = await cachedDeploy();
  const address2 = await cachedDeploy();
  t.is(provider.deployCount, 1);
  t.is(address2, address1);
});

test('does not reuse unrelated version', async t => {
  const provider = stubProvider();
  const address1 = await fetchOrDeploy('version1', provider, provider.deploy);
  const address2 = await fetchOrDeploy('version2', provider, provider.deploy);
  t.is(provider.deployCount, 2);
  t.not(address2, address1);
});

function stubProvider() {
  const chainId = '0x' + crypto.randomBytes(8).toString('hex');
  const addresses = new Set<string>();
  return {
    get deployCount() {
      return addresses.size;
    },
    async deploy(): Promise<Deployment> {
      const address = '0x' + crypto.randomBytes(20).toString('hex');
      addresses.add(address);
      return {
        address,
        layout: {
          storage: [],
          types: {},
        },
      };
    },
    async send(method: string, params?: unknown[]) {
      if (method === 'eth_chainId') {
        return chainId;
      } else if (method === 'eth_getCode') {
        const param = params?.[0];
        if (typeof param !== 'string') throw new Error('Param must be string');
        if (addresses.has(param)) {
          return '0x1234';
        } else {
          return '0x';
        }
      } else {
        throw new Error(`Method ${method} not stubbed`);
      }
    },
  };
}
