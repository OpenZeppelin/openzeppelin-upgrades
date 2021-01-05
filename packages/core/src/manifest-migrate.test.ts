import _test, { TestInterface } from 'ava';
import assert from 'assert';

import { artifacts } from 'hardhat';

import { solcInputOutputDecoder } from './src-decoder';
import { validate, ValidationRunData } from './validate/run';
import { getStorageLayout } from './validate/query';
import { normalizeValidationData, ValidationData } from './validate/data';
import { StorageLayout } from './storage/layout';

import { currentManifestVersion } from './manifest';
import { migrateManifestData, getUpdatedStorageLayout } from './manifest-migrate';

interface Context {
  validationRun: ValidationRunData;
  validationData: ValidationData;
}

const test = _test as TestInterface<Context>;

test.before(async t => {
  const buildInfo = await artifacts.getBuildInfo('contracts/test/ManifestMigrate.sol:ManifestMigrateUnique');
  assert(buildInfo !== undefined, 'Build info not found');
  const decodeSrc = solcInputOutputDecoder(buildInfo.input, buildInfo.output);
  t.context.validationRun = validate(buildInfo.output, decodeSrc);
  t.context.validationData = normalizeValidationData([t.context.validationRun]);
});

test('migrateManifestData - version bump', t => {
  const manifestData = {
    manifestVersion: '3.0',
    impls: {},
  };
  migrateManifestData(manifestData, t.context.validationData);
  t.is(manifestData.manifestVersion, currentManifestVersion);
});

test('migrateManifestData - udpate layout', t => {
  const { version } = t.context.validationRun['ManifestMigrateUnique'];
  assert(version !== undefined);
  const updatedLayout = getStorageLayout(t.context.validationData, version);
  const outdatedLayout = removeStorageLayoutMembers(updatedLayout);
  const manifestData = {
    manifestVersion: '3.1',
    impls: {
      c0b708c73eb888fc608e606f94eccb59e8b14170d9167dc00d7c90ce39ad72ea: {
        address: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
        txHash: '0x6580b51f3edcacacf30d7b4140e4022b65d2a5ba7cbe7e4d91397f4c3b5e8a6b',
        layout: outdatedLayout,
      },
    },
  };
  migrateManifestData(manifestData, t.context.validationData);
  t.like(manifestData, {
    impls: {
      c0b708c73eb888fc608e606f94eccb59e8b14170d9167dc00d7c90ce39ad72ea: {
        address: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
        txHash: '0x6580b51f3edcacacf30d7b4140e4022b65d2a5ba7cbe7e4d91397f4c3b5e8a6b',
        layout: updatedLayout,
      },
    },
  });
});

test('getUpdatedLayout - unique layout match', async t => {
  const { version } = t.context.validationRun['ManifestMigrateUnique'];
  assert(version !== undefined);
  const targetLayout = getStorageLayout(t.context.validationData, version);
  const outdatedLayout = removeStorageLayoutMembers(targetLayout);
  const updatedLayout = getUpdatedStorageLayout(t.context.validationData, version.withoutMetadata, outdatedLayout);
  t.deepEqual(updatedLayout, targetLayout);
});

test('getUpdatedLayout - multiple unambiguous layout matches', async t => {
  const { version: version1 } = t.context.validationRun['ManifestMigrateUnambiguous1'];
  const { version: version2 } = t.context.validationRun['ManifestMigrateUnambiguous2'];
  assert(version1 !== undefined && version2 !== undefined);
  t.is(version1.withoutMetadata, version2.withoutMetadata, 'version is meant to be ambiguous');
  const targetLayout = getStorageLayout(t.context.validationData, version1);
  const outdatedLayout = removeStorageLayoutMembers(targetLayout);
  const updatedLayout = getUpdatedStorageLayout(t.context.validationData, version1.withoutMetadata, outdatedLayout);
  t.deepEqual(updatedLayout, targetLayout);
});

test('getUpdatedLayout - multiple ambiguous layout matches', async t => {
  const { version: version1 } = t.context.validationRun['ManifestMigrateAmbiguous1'];
  const { version: version2 } = t.context.validationRun['ManifestMigrateAmbiguous2'];
  assert(version1 !== undefined && version2 !== undefined);
  t.is(version1.withoutMetadata, version2.withoutMetadata, 'version is meant to be ambiguous');
  const targetLayout = getStorageLayout(t.context.validationData, version1);
  const outdatedLayout = removeStorageLayoutMembers(targetLayout);
  const updatedLayout = getUpdatedStorageLayout(t.context.validationData, version1.withoutMetadata, outdatedLayout);
  t.is(updatedLayout, undefined);
});

// Simulate a layout from a version without struct/enum members
function removeStorageLayoutMembers(layout: StorageLayout): StorageLayout {
  const res = { ...layout, types: { ...layout.types } };
  for (const id in res.types) {
    res.types[id] = { ...layout.types[id], members: undefined };
  }
  return res;
}
