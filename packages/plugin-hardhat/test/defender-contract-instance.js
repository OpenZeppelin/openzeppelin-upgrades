import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { defender as defenderFactory } from '@openzeppelin/hardhat-upgrades';
import esmock from 'esmock';
import sinon from 'sinon';

const defender = await defenderFactory(hre, connection);

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

  const { getContractInstance } = await esmock('../dist/utils/contract-instance.js', {
    '../dist/defender/utils.js': {
      waitForDeployment: waitStub,
    },
  });

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

  const { getContractInstance } = await esmock('../dist/utils/contract-instance.js', {
    '../dist/defender/utils.js': {
      waitForDeployment: waitStub,
    },
  });

  // Stub hre.network.connect to return a provider with mocked getTransaction
  const originalConnect = hre.network.connect.bind(hre.network);
  const connectStub = sinon.stub(hre.network, 'connect').callsFake(async () => {
    const connection = await originalConnect();
    const originalGetTransaction = connection.ethers.provider.getTransaction.bind(connection.ethers.provider);
    sinon.stub(connection.ethers.provider, 'getTransaction').callsFake(async (hash) => {
      if (hash === second.deploymentTransaction().hash) {
        return second.deploymentTransaction();
      }
      return originalGetTransaction(hash);
    });
    return connection;
  });

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

  connectStub.restore();
});
