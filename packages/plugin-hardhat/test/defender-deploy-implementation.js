import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import esmock from 'esmock';
import manifest from '@openzeppelin/upgrades-core/dist/manifest.js';
import { mockDeploy } from './defender-utils.js';

test.beforeEach(async t => {
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.Invalid = await ethers.getContractFactory('Invalid');
  
  // Mock at the deploy-implementation level AND at the deploy-impl level
  const module = await esmock('../dist/deploy-implementation.js', {
    '../dist/utils/deploy.js': {
      deploy: mockDeploy,
    },
  }, {
    // This is the third parameter - global mocks that apply to all imports
    '../dist/utils/deploy.js': {
      deploy: mockDeploy,
    },
  });
  
  t.context.deployImplementation = module.makeDeployImplementation(hre, true, connection);
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