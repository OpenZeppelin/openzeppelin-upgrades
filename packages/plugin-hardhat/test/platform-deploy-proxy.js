const test = require('ava');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers } = hre;

test.before(async t => {
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.deployProxy = proxyquire('../dist/deploy-proxy', {
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
  }).makeDeployProxy(hre, true);
});

test('deploy proxy', async t => {
  const { deployProxy, GreeterProxiable } = t.context;

  const inst = await deployProxy(GreeterProxiable, ['Hello World'], { kind: 'uups' });
  t.not(inst, undefined);
});

test('deploy proxy - unsafe', async t => {
  const { deployProxy, Invalid } = t.context;

  await t.throwsAsync(() => deployProxy(Invalid), undefined, 'Contract `Invalid` is not upgrade safe');
});