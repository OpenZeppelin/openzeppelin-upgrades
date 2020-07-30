import test from 'ava';

import { Manifest } from './manifest';

test('manifest name for a known network', t => {
  const manifest = new Manifest(1337);
  t.is(manifest.file, '.openzeppelin/ganache.json');
});

test('manifest name for an unknown network', t => {
  const id = 55555;
  const manifest = new Manifest(id);
  t.is(manifest.file, `.openzeppelin/unknown-${id}.json`);
});
