const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const hre = require('hardhat');
const { ethers } = hre;

const {
  getProxyFactory,
  getBeaconProxyFactory,
  getTransparentUpgradeableProxyFactory,
} = require('../dist/utils/factories');
const artifactsBuildInfo = require('@openzeppelin/upgrades-core/artifacts/build-info-v5.json');

const TX_HASH = '0x1';
const DEPLOYMENT_ID = 'abc';
const ADDRESS = '0x2';
const TX_RESPONSE = 'mocked response';
const ETHERSCAN_API_KEY = 'fakeKey';
const RELAYER_ID = '123-abc';
const SALT = 'customsalt';
const CREATE_FACTORY = '0x0000000000000000000000000000000000000010';

const LOGIC_ADDRESS = '0x0000000000000000000000000000000000000003';
const INITIAL_OWNER_ADDRESS = '0x0000000000000000000000000000000000000004';
const DATA = '0x05';

test.beforeEach(async t => {
  t.context.fakeChainId = 'goerli';

  t.context.fakeDefenderClient = {
    deployContract: () => {
      return {
        txHash: TX_HASH,
        deploymentId: DEPLOYMENT_ID,
        address: ADDRESS,
      };
    },
  };
  t.context.spy = sinon.spy(t.context.fakeDefenderClient, 'deployContract');

  t.context.deploy = proxyquire('../dist/defender/deploy', {
    './utils': {
      ...require('../dist/defender/utils'),
      getNetwork: () => t.context.fakeChainId,
      getDeployClient: () => t.context.fakeDefenderClient,
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
      getAddress: address => address,
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
    remoteDeploymentId: DEPLOYMENT_ID,
  });
}

test('calls defender deploy', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {});

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: 'None',
    constructorInputs: [],
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy with relayerId', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, { relayerId: RELAYER_ID });

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: 'None',
    constructorInputs: [],
    verifySourceCode: true,
    relayerId: RELAYER_ID,
    salt: undefined,
    createFactoryAddress: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy with salt', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, { salt: SALT });

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: 'None',
    constructorInputs: [],
    verifySourceCode: true,
    relayerId: undefined,
    salt: SALT,
    createFactoryAddress: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy with createFactoryAddress', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, { createFactoryAddress: CREATE_FACTORY });

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: 'None',
    constructorInputs: [],
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: CREATE_FACTORY,
  });

  assertResult(t, result);
});

test('calls defender deploy with license', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/WithLicense.sol';
  const contractName = 'WithLicense';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {});

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: 'MIT',
    constructorInputs: [],
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy with constructor args', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Constructor.sol';
  const contractName = 'WithConstructor';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {}, 10);

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: 'MIT',
    constructorInputs: [10],
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy with verify false', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, { verifySourceCode: false });

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorInputs: [],
    verifySourceCode: false,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy with ERC1967Proxy', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
  const contractName = 'ERC1967Proxy';
  const factory = await getProxyFactory(hre);

  const result = await deploy.defenderDeploy(fakeHre, factory, {}, LOGIC_ADDRESS, DATA);
  assertResult(t, result);

  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(artifactsBuildInfo),
    licenseType: 'MIT',
    constructorInputs: [LOGIC_ADDRESS, DATA],
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
  });
});

test('calls defender deploy with BeaconProxy', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
  const contractName = 'BeaconProxy';
  const factory = await getBeaconProxyFactory(hre);

  const result = await deploy.defenderDeploy(fakeHre, factory, {}, LOGIC_ADDRESS, DATA);
  assertResult(t, result);

  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(artifactsBuildInfo),
    licenseType: 'MIT',
    constructorInputs: [LOGIC_ADDRESS, DATA],
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
  });
});

test('calls defender deploy with TransparentUpgradeableProxy', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol';
  const contractName = 'TransparentUpgradeableProxy';
  const factory = await getTransparentUpgradeableProxyFactory(hre);

  const result = await deploy.defenderDeploy(fakeHre, factory, {}, LOGIC_ADDRESS, INITIAL_OWNER_ADDRESS, DATA);
  assertResult(t, result);

  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(artifactsBuildInfo),
    licenseType: 'MIT',
    constructorInputs: [LOGIC_ADDRESS, INITIAL_OWNER_ADDRESS, DATA],
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
  });
});
