const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers } = hre;

const { getProxyFactory } = require('../dist/utils/factories');
const artifactsBuildInfo = require('@openzeppelin/upgrades-core/artifacts/build-info.json');

const TX_HASH = '0x1';
const DEPLOYMENT_ID = 'abc';
const ADDRESS = '0x2';
const TX_RESPONSE = 'mocked response';
const ETHERSCAN_API_KEY = 'fakeKey';

test.beforeEach(async t => {
  t.context.fakeChainId = 'goerli';

  t.context.fakePlatformClient = {
    Deployment: {
      deploy: () => {
        return {
          txHash: TX_HASH,
          deploymentId: DEPLOYMENT_ID,
          address: ADDRESS,
        };
      },
    },
    DeploymentConfig: {},
    BlockExplorerApiKey: {
      list: () => [{ network: t.context.fakeChainId }],
      create: () => {
        return;
      },
    },
  };
  t.context.spy = sinon.spy(t.context.fakePlatformClient.Deployment, 'deploy');

  t.context.deploy = proxyquire('../dist/platform/deploy', {
    './utils': {
      ...require('../dist/platform/utils'),
      getNetwork: () => t.context.fakeChainId,
      getAdminClient: () => t.context.fakeAdminClient,
      getPlatformClient: () => t.context.fakePlatformClient,
    },
    '../utils/etherscan-api': {
      getEtherscanAPIConfig: () => {
        return { key: ETHERSCAN_API_KEY };
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

function assertResult(t, result) {
  t.deepEqual(result, {
    address: ADDRESS,
    txHash: TX_HASH,
    deployTransaction: TX_RESPONSE,
    deploymentId: DEPLOYMENT_ID,
  });
}

test('calls platform deploy', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.platformDeploy(fakeHre, factory, {});

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorInputs: [],
    verifySourceCode: true,
  });

  assertResult(t, result);
});

test('calls platform deploy with license', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/WithLicense.sol';
  const contractName = 'WithLicense';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.platformDeploy(fakeHre, factory, {});

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: 'MIT',
    constructorInputs: [],
    verifySourceCode: true,
  });

  assertResult(t, result);
});

test('calls platform deploy with constructor args', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Constructor.sol';
  const contractName = 'WithConstructor';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.platformDeploy(fakeHre, factory, {}, 10);

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: 'MIT',
    constructorInputs: [10],
    verifySourceCode: true,
  });

  assertResult(t, result);
});

test('calls platform deploy with verify true', async t => {
  const { spy, fakePlatformClient, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  // current network is in api key list
  const list = sinon.spy(fakePlatformClient.BlockExplorerApiKey, 'list');
  const create = sinon.spy(fakePlatformClient.BlockExplorerApiKey, 'create');

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.platformDeploy(fakeHre, factory, { verifySourceCode: true });

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorInputs: [],
    verifySourceCode: true,
  });

  assertResult(t, result);

  // api key was not created since network is in list
  sinon.assert.calledOnce(list);
  sinon.assert.notCalled(create);
});

test('calls platform deploy with verify false', async t => {
  const { spy, fakePlatformClient, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  const list = sinon.spy(fakePlatformClient.BlockExplorerApiKey, 'list');
  const create = sinon.spy(fakePlatformClient.BlockExplorerApiKey, 'create');

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.platformDeploy(fakeHre, factory, { verifySourceCode: false });

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorInputs: [],
    verifySourceCode: false,
  });

  assertResult(t, result);

  // api key was not looked up since verifySourceCode set to false
  sinon.assert.notCalled(list);
  sinon.assert.notCalled(create);
});

test('calls platform deploy with verify true, create API key', async t => {
  const { spy, deploy, fakePlatformClient, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);

  // current network not in api key list
  const list = sinon.stub(fakePlatformClient.BlockExplorerApiKey, 'list');
  list.returns([{ network: 'mainnet' }]);
  const create = sinon.spy(fakePlatformClient.BlockExplorerApiKey, 'create');

  const result = await deploy.platformDeploy(fakeHre, factory, {});

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorInputs: [],
    verifySourceCode: true,
  });

  assertResult(t, result);

  // api key was created since network not in list
  sinon.assert.calledOnce(list);
  sinon.assert.calledOnce(create);
  sinon.assert.calledWithExactly(create, { key: ETHERSCAN_API_KEY, network: fakeChainId });
});

test('calls platform deploy with proxy', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
  const contractName = 'ERC1967Proxy';

  const factory = await getProxyFactory(hre);

  const logic = '0x0000000000000000000000000000000000000001';
  const data = '0x02';

  const result = await deploy.platformDeploy(fakeHre, factory, {}, logic, data);

  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(artifactsBuildInfo),
    licenseType: 'MIT',
    constructorInputs: [logic, data],
    verifySourceCode: true,
  });

  assertResult(t, result);
});
