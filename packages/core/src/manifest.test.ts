import test, { ExecutionContext } from 'ava';
import { Manifest, ManifestData, normalizeManifestData } from './manifest';
import { promises as fs } from 'fs';
import path from 'path';

async function writeTestManifest(file: string) {
  const testManifest = {
    manifestVersion: '3.2',
    impls: {},
    proxies: [
      {
        address: '0x123',
        txHash: '0x0',
        kind: 'uups',
      },
    ],
  };
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(testManifest, null, 2) + '\n');
}

async function deleteFile(t: ExecutionContext, file: string) {
  try {
    await fs.unlink(file);
  } catch (e: any) {
    if (!e.message.includes('ENOENT')) {
      t.fail(e);
    }
  }
}

async function assertOldName(t: ExecutionContext<unknown>, id: number) {
  await fs.access(`.openzeppelin/unknown-${id}.json`);
  t.throwsAsync(fs.access(`.openzeppelin/polygon-mumbai.json`));
}

async function assertNewName(t: ExecutionContext<unknown>, id: number) {
  t.throwsAsync(fs.access(`.openzeppelin/unknown-${id}.json`));
  await fs.access(`.openzeppelin/polygon-mumbai.json`);
}

async function deleteManifests(t: ExecutionContext<unknown>, id: number) {
  await deleteFile(t, `.openzeppelin/unknown-${id}.json`);
  await deleteFile(t, '.openzeppelin/polygon-mumbai.json');
}

test.serial('multiple manifests', async t => {
  const id = 80001;
  await deleteManifests(t, id);

  await writeTestManifest(`.openzeppelin/unknown-${id}.json`);
  await writeTestManifest(`.openzeppelin/polygon-mumbai.json`);

  const manifest = new Manifest(id);
  await manifest.lockedRun(async () => {
    await t.throwsAsync(() => manifest.read(), {
      message: new RegExp(
        `Network files with different names .openzeppelin/unknown-${id}.json and .openzeppelin/polygon-mumbai.json were found for the same network.`,
      ),
    });
  });

  await deleteManifests(t, id);
});

test.serial('rename manifest', async t => {
  const id = 80001;
  await deleteManifests(t, id);

  await writeTestManifest(`.openzeppelin/unknown-${id}.json`);

  const manifest = new Manifest(id);
  t.is(manifest.file, `.openzeppelin/polygon-mumbai.json`);

  t.throwsAsync(fs.access(`.openzeppelin/chain-${id}.lock`));

  await assertOldName(t, id);
  await manifest.lockedRun(async () => {
    await fs.access(`.openzeppelin/chain-${id}.lock`);
    const data = await manifest.read();
    data.proxies.push({
      address: '0x456',
      txHash: '0x0',
      kind: 'uups',
    });

    await assertOldName(t, id);
    await manifest.write(data);
    await assertNewName(t, id);
  });
  await assertNewName(t, id);

  t.throwsAsync(fs.access(`.openzeppelin/chain-${id}.lock`));

  // check that the contents were persisted
  const data = await new Manifest(id).read();
  t.true(data.proxies[0].address === '0x123');
  t.true(data.proxies[1].address === '0x456');
  await assertNewName(t, id);

  t.throwsAsync(fs.access(`.openzeppelin/chain-${id}.lock`));

  await deleteManifests(t, id);
});

test('manifest name for a known network', t => {
  const manifest = new Manifest(1);
  t.is(manifest.file, '.openzeppelin/mainnet.json');
});

test('manifest name for an unknown network', t => {
  const id = 55555;
  const manifest = new Manifest(id);
  t.is(manifest.file, `.openzeppelin/unknown-${id}.json`);
});

test('normalize manifest', t => {
  const deployment = {
    address: '0x1234',
    txHash: '0x1234',
    kind: 'uups' as const,
    layout: { solcVersion: '0.8.9', types: {}, storage: [] },
    deployTransaction: {},
  };
  const input: ManifestData = {
    manifestVersion: '3.0',
    admin: deployment,
    impls: { a: deployment },
    proxies: [deployment],
  };
  const norm = normalizeManifestData(input);
  t.like(norm.admin, {
    ...deployment,
    kind: undefined,
    layout: undefined,
    deployTransaction: undefined,
  });
  t.like(norm.impls.a, {
    ...deployment,
    kind: undefined,
    deployTransaction: undefined,
  });
  t.like(norm.proxies[0], {
    ...deployment,
    layout: undefined,
    deployTransaction: undefined,
  });
});
