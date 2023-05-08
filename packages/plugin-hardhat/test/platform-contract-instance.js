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
    address: first.address,
    txHash: first.deployTransaction.hash,
    deployTransaction: first.deployTransaction,
    remoteDeploymentId: DEPLOYMENT_ID,
  };

  const waitStub = sinon.stub();

  const getContractInstance = proxyquire('../dist/utils/contract-instance', {
    '../platform/utils': {
      waitForDeployment: waitStub,
      '@global': true,
    },
  }).getContractInstance;

  const stubbedInstance = await getContractInstance(hre, GreeterProxiable, { platform: true }, deployment);
  await stubbedInstance.deployed();

  t.is(waitStub.callCount, 1);

  // assert the tx hash is not updated
  t.not(stubbedInstance.deployTransaction.hash, undefined);
  t.is(stubbedInstance.deployTransaction.hash, first.deployTransaction.hash);
});

test('get contract instance - tx hash updated', async t => {
  const { GreeterProxiable } = t.context;

  // just deploy a contract for convenience
  const first = await GreeterProxiable.deploy();
  const second = await GreeterProxiable.deploy();

  t.not(first.deployTransaction.hash, second.deployTransaction.hash);

  const deployment = {
    address: first.address,
    txHash: first.deployTransaction.hash,
    deployTransaction: first.deployTransaction,
    remoteDeploymentId: DEPLOYMENT_ID,
  };

  const waitStub = sinon.stub().returns(second.deployTransaction.hash);

  const getContractInstance = proxyquire('../dist/utils/contract-instance', {
    '../platform/utils': {
      waitForDeployment: waitStub,
      '@global': true,
    },
  }).getContractInstance;

  const stubbedInstance = await getContractInstance(hre, GreeterProxiable, { platform: true }, deployment);

  // assert the tx hash not updated yet
  t.not(stubbedInstance.deployTransaction.hash, undefined);
  t.is(stubbedInstance.deployTransaction.hash, first.deployTransaction.hash);
  t.not(stubbedInstance.deployTransaction.hash, second.deployTransaction.hash);

  await stubbedInstance.deployed();

  t.is(waitStub.callCount, 1);

  // assert the tx hash is updated
  t.not(stubbedInstance.deployTransaction.hash, undefined);
  t.not(stubbedInstance.deployTransaction.hash, first.deployTransaction.hash);
  t.is(stubbedInstance.deployTransaction.hash, second.deployTransaction.hash);
});
