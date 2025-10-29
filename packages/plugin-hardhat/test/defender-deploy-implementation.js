import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { defender as defenderFactory } from '@openzeppelin/hardhat-upgrades';
import proxyquire from 'proxyquire';
import manifest from '@openzeppelin/upgrades-core/dist/manifest.js';

const proxyquireStrict = proxyquire.noCallThru();
const defender = await defenderFactory(hre, connection);

test.before(async t => {
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.Invalid = await ethers.getContractFactory('Invalid');
  t.context.deployImplementation = proxyquireStrict('../dist/deploy-implementation', {
    './utils/deploy': {
      deploy: async (hre, opts, factory, ...args) => {
        opts.useDefenderDeploy = false;
        return {
          // just do regular deploy but add a deployment id
          ...(await require('../dist/utils/deploy').deploy(hre, opts, factory, ...args)),
          remoteDeploymentId: 'abc',
        };
      },
      '@global': true,
    },
  }).makeDeployImplementation(hre, true);
});

test('deploy implementation', async t => {
  const { deployImplementation, GreeterProxiable } = t.context;

  const inst = await deployImplementation(GreeterProxiable);
  t.not(inst, undefined);

  // check that manifest has deployment id
  const m = await manifest.Manifest.forNetwork(ethers.provider);
  await m.lockedRun(async () => {
    const deployment = await m.getDeploymentFromAddress(inst);
    t.is(deployment.remoteDeploymentId, 'abc');
  });
});

test('deploy implementation - unsafe', async t => {
  const { deployImplementation, Invalid } = t.context;

  await t.throwsAsync(() => deployImplementation(Invalid), undefined, 'Contract `Invalid` is not upgrade safe');
});
