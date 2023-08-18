const test = require('ava');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

const hre = require('hardhat');
const { ethers } = hre;

const DEPLOYMENT_ID = 'abc';

test.beforeEach(async t => {
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
});

test.afterEach.always(() => {
  sinon.restore();
});

test('get contract instance - tx hash not updated', async t => {
  const { GreeterProxiable } = t.context;

  // just deploy a contract for convenience
  const first = await GreeterProxiable.deploy();

  const deployment = {
    address: await first.getAddress(),
    txHash: first.deploymentTransaction().hash,
    deployTransaction: first.deploymentTransaction(),
    remoteDeploymentId: DEPLOYMENT_ID,
  };

  const waitStub = sinon.stub();

  const getContractInstance = proxyquire('../dist/utils/contract-instance', {
    '../defender/utils': {
      waitForDeployment: waitStub,
      '@global': true,
    },
  }).getContractInstance;

  const stubbedInstance = await getContractInstance(hre, GreeterProxiable, { useDefenderDeploy: true }, deployment);
  await stubbedInstance.waitForDeployment();

  t.is(waitStub.callCount, 1);

  // assert the tx hash is not updated
  t.not(stubbedInstance.deploymentTransaction().hash, undefined);
  t.is(stubbedInstance.deploymentTransaction().hash, first.deploymentTransaction().hash);
});

test('get contract instance - tx hash updated', async t => {
  const { GreeterProxiable } = t.context;

  // just deploy a contract for convenience
  const first = await GreeterProxiable.deploy();
  const second = await GreeterProxiable.deploy();

  t.not(first.deploymentTransaction().hash, second.deploymentTransaction().hash);

  const deployment = {
    address: await first.getAddress(),
    txHash: first.deploymentTransaction().hash,
    deployTransaction: first.deploymentTransaction(),
    remoteDeploymentId: DEPLOYMENT_ID,
  };

  const waitStub = sinon.stub().returns(second.deploymentTransaction().hash);

  const getContractInstance = proxyquire('../dist/utils/contract-instance', {
    '../defender/utils': {
      waitForDeployment: waitStub,
      '@global': true,
    },
  }).getContractInstance;

  const stubbedInstance = await getContractInstance(hre, GreeterProxiable, { useDefenderDeploy: true }, deployment);

  // assert the tx hash not updated yet
  t.not(stubbedInstance.deploymentTransaction().hash, undefined);
  t.is(stubbedInstance.deploymentTransaction().hash, first.deploymentTransaction().hash);
  t.not(stubbedInstance.deploymentTransaction().hash, second.deploymentTransaction().hash);

  await stubbedInstance.waitForDeployment();

  t.is(waitStub.callCount, 1);

  // assert the tx hash is updated
  t.not(stubbedInstance.deploymentTransaction().hash, undefined);
  t.not(stubbedInstance.deploymentTransaction().hash, first.deploymentTransaction().hash);
  t.is(stubbedInstance.deploymentTransaction().hash, second.deploymentTransaction().hash);
});
