const test = require('ava');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers } = hre;

const manifest = require('@openzeppelin/upgrades-core/dist/manifest');

test.before(async t => {
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.Invalid = await ethers.getContractFactory('Invalid');
  t.context.deployImplementation = proxyquire('../dist/deploy-implementation', {
    './utils/deploy': {
      deploy: async (hre, opts, factory, ...args) => {
        opts.usePlatformDeploy = false;
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
