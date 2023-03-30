const test = require('ava');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

const hre = require('hardhat');
const { ethers } = hre;

const manifest = require('@openzeppelin/upgrades-core/dist/manifest');

const IMPL_ID = 'abc';
const PROXY_ID = 'def';

test.before(async t => {
  const stub = sinon.stub();
  stub.onCall(0).returns(IMPL_ID);
  stub.onCall(1).returns(PROXY_ID);

  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.deployProxy = proxyquire('../dist/deploy-proxy', {
    './utils/deploy': {
      deploy: async (hre, opts, factory, ...args) => {
        opts.platform = false;
        return {
          // just do regular deploy but add a deployment id
          ...(await require('../dist/utils/deploy').deploy(hre, opts, factory, ...args)),
          deploymentId: stub(),
        };
      },
      '@global': true,
    },
  }).makeDeployProxy(hre, true);
});

test('deploy proxy', async t => {
  const { deployProxy, GreeterProxiable } = t.context;

  const inst = await deployProxy(GreeterProxiable, ['Hello World'], { kind: 'uups' });
  t.not(inst.address, undefined);

  // check that manifest has deployment ids
  const m = await manifest.Manifest.forNetwork(ethers.provider);

  await m.lockedRun(async () => {
    const proxy = await m.getProxyFromAddress(inst.address);
    t.is(proxy.deploymentId, PROXY_ID);

    const impl = await m.getDeploymentFromAddress(await hre.upgrades.erc1967.getImplementationAddress(inst.address));
    t.is(impl.deploymentId, IMPL_ID);
  });
});

test('deploy proxy - unsafe', async t => {
  const { deployProxy, Invalid } = t.context;

  await t.throwsAsync(() => deployProxy(Invalid), undefined, 'Contract `Invalid` is not upgrade safe');
});
