import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import test from 'ava';
import { Manifest, UpgradesError, getVersion, toEip1967Hash } from '@openzeppelin/upgrades-core';

import { deployUpgradeableImpl } from '../dist/engine/deploy-impl.js';
import { validateImplementation, validateUpgrade } from '../dist/engine/validate.js';

const [V1, V2, UNSAFE] = ['0x608060405201', '0x608060405202', '0x608060405203'];
const ABI = [{ type: 'constructor', inputs: [{ name: 'args', type: 'uint256' }], stateMutability: 'nonpayable' }];
const [IMPL, PROXY] = ['11', '22'].map(b => '0x' + b.repeat(20));
const IMPL_SLOT = toEip1967Hash('eip1967.proxy.implementation');

const entry = (code, labels, errors = []) => ({
  src: 'C.sol:1',
  version: getVersion(code),
  inherit: [],
  libraries: [],
  methods: [],
  linkReferences: [],
  errors,
  solcVersion: '0.8.20',
  layout: {
    flat: true,
    storage: labels.map(label => ({ contract: 'C', label, type: 'u', src: 'C.sol:1' })),
    types: { u: { label: 'uint256', numberOfBytes: '32' } },
  },
});

let tmpDir;
let manifestFile;
let binding;

test.before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oz-val-'));
  const v1 = entry(V1, ['x']);
  const log = [{ C1: v1, C2: entry(V2, ['x', 'y']), Bad: entry(UNSAFE, ['x'], [{ kind: 'constructor', src: 'C:2' }]) }];
  await fs.writeFile(path.join(tmpDir, 'validations.json'), JSON.stringify({ version: '3.5', log }));

  const provider = {
    async send(method, params = []) {
      if (method === 'eth_chainId') return '0x7a69';
      if (method === 'hardhat_metadata') return { chainId: 31337, instanceId: '0x654' };
      if (method === 'anvil_metadata') throw new Error('unsupported');
      if (params[0]?.toLowerCase() === PROXY && '0x' + BigInt(params[1] ?? 0).toString(16) === IMPL_SLOT) {
        return '0x' + IMPL.slice(2).padStart(64, '0');
      }
      return '0x' + '00'.repeat(32);
    },
  };

  const manifest = await Manifest.forNetwork(provider);
  manifestFile = manifest.file;
  const ver = getVersion(V1, V1, '0x' + '11'.padStart(64, '0'));
  await manifest.lockedRun(async () => {
    const data = await manifest.read();
    data.impls[ver.linkedWithoutMetadata] = { address: IMPL, layout: v1.layout };
    await manifest.write(data);
  });
  await manifest.addProxy({ address: PROXY, kind: 'transparent' });

  binding = {
    hre: { config: { paths: { cache: tmpDir } } },
    provider,
    encodeConstructorArgs(info, args) {
      const expected = info.abi.find(i => i.type === 'constructor')?.inputs?.length ?? 0;
      if (args.length !== expected) throw new UpgradesError(`Expected ${expected} constructor argument(s)`);
      return '0x';
    },
  };
});

test.after.always(async () => {
  if (manifestFile) await fs.rm(manifestFile, { force: true });
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
});

test('validates contracts with constructor args while preserving unsafe/deploy checks', async t => {
  const [v1, v2] = [
    { abi: ABI, bytecode: V1 },
    { abi: ABI, bytecode: V2 },
  ];
  await t.notThrowsAsync(() => validateImplementation(binding, v1, { kind: 'transparent' }));
  await t.notThrowsAsync(() => validateUpgrade(binding, { kind: 'info', info: v1 }, v2, {}));
  await t.notThrowsAsync(() => validateUpgrade(binding, { kind: 'address', address: PROXY }, v2, {}));
  await t.throwsAsync(() => validateImplementation(binding, { abi: ABI, bytecode: UNSAFE }, { kind: 'transparent' }), {
    message: /has a constructor/,
  });
  await t.throwsAsync(() => deployUpgradeableImpl(binding, v1, { kind: 'transparent' }, undefined), {
    message: /Expected 1 constructor argument\(s\)/,
  });
});
