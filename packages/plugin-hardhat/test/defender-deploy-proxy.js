import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory, defender as defenderFactory } from '@openzeppelin/hardhat-upgrades';
import esmock from 'esmock';
import sinon from 'sinon';
import manifest from '@openzeppelin/upgrades-core/dist/manifest.js';
import { mockDeploy as baseMockDeploy } from './defender-utils.js';

let upgrades;
let defender;

const IMPL_ID = 'abc';

const PROXY_TX_HASH = '0x2';
const PROXY_ID = 'def';

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
  defender = await defenderFactory(hre, connection);
});

test.beforeEach(async t => {
  const stub = sinon.stub();
  stub.onCall(0).returns(IMPL_ID);
  stub.onCall(1).returns(PROXY_ID);

  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.Invalid = await ethers.getContractFactory('Invalid');
  
  // Create a wrapper around the shared mock deploy function to use the stub
  const mockDeploy = async (hre, opts, factory, ...args) => {
    const result = await baseMockDeploy(hre, opts, factory, ...args);
    return {
      ...result,
      remoteDeploymentId: stub(),
    };
  };
  
  const module = await esmock('../dist/deploy-proxy.js', {
    '../dist/utils/deploy.js': {
      deploy: mockDeploy,
    },
  }, {
    // Global mocks
    '../dist/utils/deploy.js': {
      deploy: mockDeploy,
    },
  });
  
  t.context.deployProxy = module.makeDeployProxy(hre, true, connection);
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
      await upgrades.erc1967.getImplementationAddress(await inst.getAddress()),
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
  const realProxy = await upgrades.deployProxy(GreeterProxiable, ['Hello World']);

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

  const module = await esmock('../dist/deploy-proxy.js', {
    '../dist/defender/deploy.js': {
      defenderDeploy: deployStub,
    },
    '../dist/defender/utils.js': {
      waitForDeployment: waitStub,
      enableDefender: (hre, defenderModule, opts) => {
        return {
          ...opts,
          useDefenderDeploy: true,
        };
      },
    },
  }, {
    // Global mocks
    '../dist/defender/deploy.js': {
      defenderDeploy: deployStub,
    },
    '../dist/defender/utils.js': {
      waitForDeployment: waitStub,
      enableDefender: (hre, defenderModule, opts) => {
        return {
          ...opts,
          useDefenderDeploy: true,
        };
      },
    },
  });
  
  const deployProxy = module.makeDeployProxy(hre, true, connection);

  const inst = await deployProxy(GreeterProxiable, ['Hello World']);
  await inst.waitForDeployment();

  t.is(waitStub.callCount, 1);
});