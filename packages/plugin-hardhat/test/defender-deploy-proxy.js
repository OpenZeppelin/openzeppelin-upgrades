const test = require('ava');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

const hre = require('hardhat');
const { ethers } = hre;

const manifest = require('@openzeppelin/upgrades-core/dist/manifest');

const IMPL_ID = 'abc';

const PROXY_TX_HASH = '0x2';
const PROXY_ID = 'def';

test.beforeEach(async t => {
  const stub = sinon.stub();
  stub.onCall(0).returns(IMPL_ID);
  stub.onCall(1).returns(PROXY_ID);

  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.deployProxy = proxyquire('../dist/deploy-proxy', {
    './utils/deploy': {
      deploy: async (hre, opts, factory, ...args) => {
        opts.useDefenderDeploy = false;
        return {
          // just do regular deploy but add a deployment id
          ...(await require('../dist/utils/deploy').deploy(hre, opts, factory, ...args)),
          remoteDeploymentId: stub(),
        };
      },
      '@global': true,
    },
  }).makeDeployProxy(hre, true);
});

test.afterEach.always(() => {
  sinon.restore();
});

test('deploy proxy', async t => {
  const { deployProxy, GreeterProxiable } = t.context;

  const inst = await deployProxy(GreeterProxiable, ['Hello World']);
  t.not(await inst.getAddress(), undefined);

  // check that manifest has deployment ids
  const m = await manifest.Manifest.forNetwork(ethers.provider);

  await m.lockedRun(async () => {
    const proxy = await m.getProxyFromAddress(await inst.getAddress());
    t.is(proxy.remoteDeploymentId, PROXY_ID);

    const impl = await m.getDeploymentFromAddress(
      await hre.upgrades.erc1967.getImplementationAddress(await inst.getAddress()),
    );
    t.is(impl.remoteDeploymentId, IMPL_ID);
  });
});

test('deploy proxy - unsafe', async t => {
  const { deployProxy, Invalid } = t.context;

  await t.throwsAsync(() => deployProxy(Invalid), undefined, 'Contract `Invalid` is not upgrade safe');
});

test('deployed calls wait for deployment', async t => {
  const { GreeterProxiable } = t.context;

  // predeploy a proxy normally for two reasons:
  // 1. so we have a real address
  // 2. so it predeploys the implementation since we are assuming the impl is being deployed by Defender
  const realProxy = await hre.upgrades.deployProxy(GreeterProxiable, ['Hello World']);

  // stub proxy deployment
  const deployStub = sinon.stub();
  deployStub.returns({
    address: await realProxy.getAddress(),
    txHash: PROXY_TX_HASH,
    deployTransaction: undefined,
    remoteDeploymentId: PROXY_ID,
  });

  // stub the waitForDeployment function
  const waitStub = sinon.stub();

  const deployProxy = proxyquire('../dist/deploy-proxy', {
    './defender/deploy': {
      defenderDeploy: deployStub,
      '@global': true,
    },
    './defender/utils': {
      waitForDeployment: waitStub,
      enableDefender: (hre, defenderModule, opts) => {
        return {
          ...opts,
          useDefenderDeploy: true,
        };
      },
      '@global': true,
    },
  }).makeDeployProxy(hre, true);

  const inst = await deployProxy(GreeterProxiable, ['Hello World']);
  await inst.waitForDeployment();

  t.is(waitStub.callCount, 1);
});
