import test from 'ava';
import { Manifest, migrateManifest } from './manifest';

test('manifest name for a known network', t => {
  const manifest = new Manifest(1);
  t.is(manifest.file, '.openzeppelin/mainnet.json');
});

test('manifest name for an unknown network', t => {
  const id = 55555;
  const manifest = new Manifest(id);
  t.is(manifest.file, `.openzeppelin/unknown-${id}.json`);
});

test('manifest 3.0 → 3.1 version bump', t => {
  const migratableManifest = {
    manifestVersion: '3.0',
    impls: {},
  };

  const migratedManifest = migrateManifest(migratableManifest);
  t.is(migratedManifest.manifestVersion, `3.1`);
});
