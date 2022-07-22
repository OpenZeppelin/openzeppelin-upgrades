import test, { ExecutionContext } from 'ava';
import { Manifest, ManifestData, normalizeManifestData } from './manifest';
import fs from 'fs';
import path from 'path';

function writeTestManifest(file: string) {
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
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(testManifest, null, 2) + '\n');
}

function deleteFile(t: ExecutionContext, file: string) {
  try {
    fs.unlinkSync(file);
  } catch (e: any) {
    if (!e.message.includes('ENOENT')) {
      t.fail(e);
    }
  }
}

function assertOldName(t: ExecutionContext<unknown>, id: number) {
  t.true(fs.existsSync(`.openzeppelin/unknown-${id}.json`));
  t.false(fs.existsSync(`.openzeppelin/polygon-mumbai.json`));
}

function assertNewName(t: ExecutionContext<unknown>, id: number) {
  t.false(fs.existsSync(`.openzeppelin/unknown-${id}.json`));
  t.true(fs.existsSync(`.openzeppelin/polygon-mumbai.json`));
}

function deleteManifests(t: ExecutionContext<unknown>, id: number) {
  deleteFile(t, `.openzeppelin/unknown-${id}.json`);
  deleteFile(t, '.openzeppelin/polygon-mumbai.json');
}

test.serial('multiple manifests', async t => {
  const id = 80001;
  deleteManifests(t, id);

  writeTestManifest(`.openzeppelin/unknown-${id}.json`);
  writeTestManifest(`.openzeppelin/polygon-mumbai.json`);

  const manifest = new Manifest(id);
  await manifest.lockedRun(async () => {
    await t.throwsAsync(() => manifest.read(), {
      message: new RegExp(
        `Network files with different names .openzeppelin/unknown-${id}.json and .openzeppelin/polygon-mumbai.json were found for the same network.`,
      ),
    });
  });

  deleteManifests(t, id);
});

test.serial('rename manifest', async t => {
  const id = 80001;
  deleteManifests(t, id);

  writeTestManifest(`.openzeppelin/unknown-${id}.json`);

  const manifest = new Manifest(id);
  t.is(manifest.file, `.openzeppelin/polygon-mumbai.json`);

  t.false(fs.existsSync(`.openzeppelin/chain-${id}.lock`));

  assertOldName(t, id);
  await manifest.lockedRun(async () => {
    t.true(fs.existsSync(`.openzeppelin/chain-${id}.lock`));
    const data = await manifest.read();
    data.proxies.push({
      address: '0x456',
      txHash: '0x0',
      kind: 'uups',
    });

    assertOldName(t, id);
    await manifest.write(data);
    assertNewName(t, id);
  });
  assertNewName(t, id);

  t.false(fs.existsSync(`.openzeppelin/chain-${id}.lock`));

  // check that the contents were persisted
  const data = await new Manifest(id).read();
  t.true(data.proxies[0].address === '0x123');
  t.true(data.proxies[1].address === '0x456');
  assertNewName(t, id);

  t.false(fs.existsSync(`.openzeppelin/chain-${id}.lock`));

  deleteManifests(t, id);
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
    layout: { types: {}, storage: [] },
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
