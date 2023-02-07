import os from 'os';
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

test.serial('forked chain from known network with fallback name', async t => {
  const forkedId = 80001;
  const devId = 55555;

  await deleteManifests(t, forkedId);

  await writeTestManifest(`.openzeppelin/unknown-${forkedId}.json`);

  const instanceId = '0xa';
  const devInstanceMetadata = { instanceId: instanceId, forkedNetwork: { chainId: forkedId } };

  const manifest = new Manifest(devId, devInstanceMetadata, os.tmpdir());

  await assertOldName(t, forkedId);
  await manifest.lockedRun(async () => {
    await fs.access(`${os.tmpdir()}/openzeppelin-upgrades/chain-${devId}-${instanceId}.lock`);
    const data = await manifest.read();
    data.proxies.push({
      address: '0x456',
      txHash: '0x0',
      kind: 'uups',
    });

    await assertOldName(t, forkedId);
    await manifest.write(data);
    await assertOldName(t, forkedId); // original network file should not be changed
  });
  t.throwsAsync(fs.access(`${os.tmpdir()}/openzeppelin-upgrades/chain-${devId}-${instanceId}.lock`));
  await fs.access(`${os.tmpdir()}/openzeppelin-upgrades/dev-${devId}-${instanceId}.json`);

  // check that the contents were NOT persisted to original manifest
  const orig = await new Manifest(forkedId).read();
  t.true(orig.proxies.length === 1);
  t.true(orig.proxies[0].address === '0x123');

  // check that the contents were persisted to dev copy of manifest
  const dev = await new Manifest(devId, devInstanceMetadata, os.tmpdir()).read();
  t.true(dev.proxies.length === 2);
  t.true(dev.proxies[0].address === '0x123');
  t.true(dev.proxies[1].address === '0x456');

  await deleteManifests(t, forkedId);
  await deleteFile(t, `${os.tmpdir()}/openzeppelin-upgrades/dev-${devId}-${instanceId}.json`);
});

test.serial('forked chain from known network with actual name', async t => {
  const forkedId = 80001;
  const devId = 55555;

  await deleteManifests(t, forkedId);

  await writeTestManifest(`.openzeppelin/polygon-mumbai.json`);

  const instanceId = '0xb';
  const devInstanceMetadata = { instanceId: instanceId, forkedNetwork: { chainId: forkedId } };

  const manifest = new Manifest(devId, devInstanceMetadata, os.tmpdir());

  await assertNewName(t, forkedId);
  await manifest.lockedRun(async () => {
    await fs.access(`${os.tmpdir()}/openzeppelin-upgrades/chain-${devId}-${instanceId}.lock`);
    const data = await manifest.read();
    data.proxies.push({
      address: '0x456',
      txHash: '0x0',
      kind: 'uups',
    });

    await assertNewName(t, forkedId);
    await manifest.write(data);
    await assertNewName(t, forkedId); // original network file should not be changed
  });
  t.throwsAsync(fs.access(`${os.tmpdir()}/openzeppelin-upgrades/chain-${devId}-${instanceId}.lock`));
  await fs.access(`${os.tmpdir()}/openzeppelin-upgrades/dev-${devId}-${instanceId}.json`);

  // check that the contents were NOT persisted to original manifest
  const orig = await new Manifest(forkedId).read();
  t.true(orig.proxies.length === 1);
  t.true(orig.proxies[0].address === '0x123');

  // check that the contents were persisted to dev copy of manifest
  const dev = await new Manifest(devId, devInstanceMetadata, os.tmpdir()).read();
  t.true(dev.proxies.length === 2);
  t.true(dev.proxies[0].address === '0x123');
  t.true(dev.proxies[1].address === '0x456');

  await deleteManifests(t, forkedId);
  await deleteFile(t, `${os.tmpdir()}/openzeppelin-upgrades/dev-${devId}-${instanceId}.json`);
});

test.serial('forked chain without existing manifest', async t => {
  const forkedId = 80001;
  const devId = 55555;

  await deleteManifests(t, forkedId);

  const instanceId = '0xc';
  const devInstanceMetadata = { instanceId: instanceId, forkedNetwork: { chainId: forkedId } };

  const manifest = new Manifest(devId, devInstanceMetadata, os.tmpdir());

  await manifest.lockedRun(async () => {
    await fs.access(`${os.tmpdir()}/openzeppelin-upgrades/chain-${devId}-${instanceId}.lock`);
    const data = await manifest.read();
    data.proxies.push({
      address: '0x456',
      txHash: '0x0',
      kind: 'uups',
    });

    await manifest.write(data);
  });
  t.throwsAsync(fs.access(`${os.tmpdir()}/openzeppelin-upgrades/chain-${devId}-${instanceId}.lock`));
  await fs.access(`${os.tmpdir()}/openzeppelin-upgrades/dev-${devId}-${instanceId}.json`);

  // check that the contents were NOT persisted to regular manifest
  t.throwsAsync(fs.access(`.openzeppelin/unknown-${forkedId}.json`));
  t.throwsAsync(fs.access(`.openzeppelin/polygon-mumbai.json`));

  // check that the contents were persisted to dev copy of manifest
  const dev = await new Manifest(devId, devInstanceMetadata, os.tmpdir()).read();
  t.true(dev.proxies.length === 1);
  t.true(dev.proxies[0].address === '0x456');

  await deleteManifests(t, forkedId);
  await deleteFile(t, `${os.tmpdir()}/openzeppelin-upgrades/dev-${devId}-${instanceId}.json`);
});

test.serial('dev instance with known network id', async t => {
  const devId = 80001;

  await deleteManifests(t, devId);

  // dev instance without forking, so this real manifest should not be actually used
  await writeTestManifest(`.openzeppelin/polygon-mumbai.json`);

  const instanceId = '0xc';
  const devInstanceMetadata = { instanceId: instanceId };

  const manifest = new Manifest(devId, devInstanceMetadata, os.tmpdir());

  await manifest.lockedRun(async () => {
    await fs.access(`${os.tmpdir()}/openzeppelin-upgrades/chain-${devId}-${instanceId}.lock`);
    const data = await manifest.read();
    data.proxies.push({
      address: '0x456',
      txHash: '0x0',
      kind: 'uups',
    });

    await manifest.write(data);
  });
  t.throwsAsync(fs.access(`${os.tmpdir()}/openzeppelin-upgrades/chain-${devId}-${instanceId}.lock`));
  await fs.access(`${os.tmpdir()}/openzeppelin-upgrades/dev-${devId}-${instanceId}.json`);

  // check that the contents were NOT persisted to original manifest
  const orig = await new Manifest(devId).read();
  t.true(orig.proxies.length === 1);
  t.true(orig.proxies[0].address === '0x123');

  // check that the contents were persisted to dev manifest without original contents
  const dev = await new Manifest(devId, devInstanceMetadata, os.tmpdir()).read();
  t.true(dev.proxies.length === 1);
  t.true(dev.proxies[0].address === '0x456');

  await deleteManifests(t, devId);
  await deleteFile(t, `${os.tmpdir()}/openzeppelin-upgrades/dev-${devId}-${instanceId}.json`);
});

test('manifest name for a known network', t => {
  const manifest = new Manifest(1);
  t.is(manifest.file, '.openzeppelin/mainnet.json');
});

test('manifest name for a known network, development instance', t => {
  const chainId = 1;
  const instanceId = '0x11111';
  const devInstanceMetadata = { instanceId: instanceId };

  const manifest = new Manifest(chainId, devInstanceMetadata, '/tmp');
  t.is(manifest.file, `.openzeppelin/mainnet.json`);
  t.is(manifest.fallbackFile, `.openzeppelin/unknown-1.json`);
  t.is(manifest.devFile, `/tmp/openzeppelin-upgrades/dev-${chainId}-${instanceId}.json`);
});

test('manifest name for an unknown network', t => {
  const id = 55555;
  const manifest = new Manifest(id);
  t.is(manifest.file, `.openzeppelin/unknown-${id}.json`);
});

test('manifest name for an unknown network, development instance', t => {
  const chainId = 55555;
  const instanceId = '0x22222';
  const devInstanceMetadata = { instanceId: instanceId };

  const manifest = new Manifest(chainId, devInstanceMetadata, '/tmp');
  t.is(manifest.file, `.openzeppelin/unknown-${chainId}.json`);
  t.is(manifest.fallbackFile, `.openzeppelin/unknown-${chainId}.json`);
  t.is(manifest.devFile, `/tmp/openzeppelin-upgrades/dev-${chainId}-${instanceId}.json`);
});

test('manifest dev instance without tmp dir param', t => {
  const chainId = 1;
  const instanceId = '0x33333';
  const devInstanceMetadata = { instanceId: instanceId };

  t.throws(() => new Manifest(chainId, devInstanceMetadata));
});

test('manifest lock file name for a development network instance', async t => {
  const chainId = 55555;
  const instanceId = '0x55555';
  const devInstanceMetadata = { instanceId: instanceId };

  const manifest = new Manifest(chainId, devInstanceMetadata, '/tmp');

  await manifest.lockedRun(async () => {
    t.throwsAsync(fs.access(`.openzeppelin/chain-${chainId}.lock`));
    t.throwsAsync(fs.access(`.openzeppelin/chain-${chainId}-${instanceId}.lock`));
    t.throwsAsync(fs.access(`/tmp/openzeppelin-upgrades/chain-${chainId}.lock`));
    await fs.access(`/tmp/openzeppelin-upgrades/chain-${chainId}-${instanceId}.lock`);
  });
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
