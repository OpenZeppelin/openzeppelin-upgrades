const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers } = hre;

const apiKey = 'etherscan_api_key';
const txHash = '0x1';
const deploymentId = 'abc';
const address = '0x2';
const transactionResponse = 'mocked response';

test.beforeEach(async t => {
  t.context.fakePlatformClient = {
    Deployment: {
      deploy: () => 'to be stubbed',
    },
    DeploymentConfig: {},
    BlockExplorerApiKey: {
      list: () => [apiKey],
      create: () => '',
    },
  };
  const stub = sinon.stub(t.context.fakePlatformClient.Deployment, 'deploy');
  stub.returns({
    txHash: txHash,
    deploymentId: deploymentId,
    address: address,
  });
  t.context.stub = stub;

  t.context.fakeChainId = 'goerli';

  t.context.deploy = proxyquire('../dist/platform/deploy', {
    './utils': {
      ...require('../dist/platform/utils'),
      getNetwork: () => t.context.fakeChainId,
      getAdminClient: () => t.context.fakeAdminClient,
      getPlatformClient: () => t.context.fakePlatformClient,
    },
    '../utils/etherscan-api': {
      getEtherscanAPIConfig: () => {
        return { key: 'fakeKey' };
      },
    },
  });

  t.context.fakeHre = {
    artifacts: hre.artifacts,
    config: hre.config,
    ethers: {
      provider: {
        getTransaction: () => 'mocked response',
      },
      utils: {
        getAddress: address => address,
      },
    },
    network: {
      provider: { send: async () => t.context.fakeChainId },
    },
  };
});

test.afterEach.always(() => {
  sinon.restore();
});

test('calls platform deploy', async t => {
  const { stub, deploy, fakeHre, fakeChainId } = t.context;

  const Greeter = await ethers.getContractFactory('Greeter');

  const result = await deploy.platformDeploy(fakeHre, Greeter, {});

  const buildInfo = await hre.artifacts.getBuildInfo('contracts/Greeter.sol:Greeter');
  sinon.assert.calledWithExactly(stub, {
    contractName: 'Greeter',
    contractPath: 'contracts/Greeter.sol',
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorInputs: [],
    verifySourceCode: true,
  });

  t.deepEqual(result, {
    address: address,
    txHash: txHash,
    deployTransaction: transactionResponse,
    deploymentId: deploymentId,
  });
});
