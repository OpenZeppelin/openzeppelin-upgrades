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

async function deployAndAssert(
  contractName,
  deploy,
  fakeHre,
  contractPath,
  stub,
  fakeChainId,
  t,
  constructorArgs,
  licenseType,
) {
  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.platformDeploy(fakeHre, factory, {}, ...constructorArgs);

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(stub, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: licenseType,
    constructorInputs: constructorArgs,
    verifySourceCode: true,
  });

  t.deepEqual(result, {
    address: address,
    txHash: txHash,
    deployTransaction: transactionResponse,
    deploymentId: deploymentId,
  });
}

test('calls platform deploy', async t => {
  const { stub, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  await deployAndAssert(contractName, deploy, fakeHre, contractPath, stub, fakeChainId, t, [], undefined);
});

test('calls platform deploy with license', async t => {
  const { stub, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/WithLicense.sol';
  const contractName = 'WithLicense';

  await deployAndAssert(contractName, deploy, fakeHre, contractPath, stub, fakeChainId, t, [], 'MIT');
});

test('calls platform deploy with constructor args', async t => {
  const { stub, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Constructor.sol';
  const contractName = 'WithConstructor';

  await deployAndAssert(contractName, deploy, fakeHre, contractPath, stub, fakeChainId, t, [10], 'MIT');
});
