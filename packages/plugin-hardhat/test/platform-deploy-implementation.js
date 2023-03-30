const test = require('ava');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers } = hre;

test.before(async t => {
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.Invalid = await ethers.getContractFactory('Invalid');
  t.context.deployImplementation = proxyquire('../dist/deploy-implementation', {
    './utils/deploy': {
      deploy: async (hre, opts, factory, ...args) => {
        opts.platform = false;
        return {
          // just do regular deploy but add a deployment id
          ...(await (require('../dist/utils/deploy').deploy(hre, opts, factory, ...args))),
          deploymentId: 'abc',
        };
      },
      '@global': true,
    },
  }).makeDeployImplementation(hre, true);
});

test('deploy contract', async t => {
  const { deployImplementation, GreeterProxiable } = t.context;

  const inst = await deployImplementation(GreeterProxiable);
  t.not(inst, undefined);
});

test('deploy contract - unsafe', async t => {
  const { deployImplementation, Invalid } = t.context;

  await t.throwsAsync(() => deployImplementation(Invalid), undefined, 'Contract `Invalid` is not upgrade safe');
});