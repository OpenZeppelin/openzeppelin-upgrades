import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { defender as defenderFactory } from '@openzeppelin/hardhat-upgrades';
import sinon from 'sinon';
import esmock from 'esmock';
import {
  getProxyFactory,
  getBeaconProxyFactory,
  getTransparentUpgradeableProxyFactory,
} from '../dist/utils/factories.js';
import artifactsBuildInfo from '@openzeppelin/upgrades-core/artifacts/build-info-v5.json' with { type: 'json' };
import { AbiCoder } from 'ethers';

const defender = await defenderFactory(hre, connection);

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
const EXTERNAL_LIBRARY_ADDRESS = '0x1230000000000000000000000000000000000456';
const EXTERNAL_LIBRARY_2_ADDRESS = '0xabc0000000000000000000000000000000000def';

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

  // Create a fake connection object
  t.context.fakeConnection = {
    ethers: {
      provider: {
        getTransaction: () => TX_RESPONSE,
      },
      getAddress: address => address,
    },
  };

  const { getNetwork: _getNetwork, ...otherDefenderUtils } = await import('../dist/defender/utils.js');
  t.context.deploy = await esmock('../dist/defender/deploy.js', {
    '../dist/defender/utils.js': {
      ...otherDefenderUtils,
      getNetwork: () => t.context.fakeChainId,
    },
    '../dist/defender/client.js': {
      getDeployClient: () => t.context.fakeDefenderClient,
    },
    '../dist/utils/etherscan-api.js': {
      getEtherscanAPIConfig: () => {
        return { key: ETHERSCAN_API_KEY };
      },
    },
  });

  // Use real HRE artifacts - this is critical for Hardhat 3
  t.context.fakeHre = {
    artifacts: hre.artifacts,
    config: hre.config,
    network: {
      provider: { send: async () => t.context.fakeChainId },
      connect: async () => t.context.fakeConnection,
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

  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {});

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.contractName, contractName);
  t.is(call.network, fakeChainId);
  t.is(call.verifySourceCode, true);
  t.is(call.constructorBytecode, '0x');

  assertResult(t, result);
});

test('calls defender deploy with relayerId', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, { relayerId: RELAYER_ID });

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.relayerId, RELAYER_ID);

  assertResult(t, result);
});

test('calls defender deploy with salt', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, { salt: SALT });

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.salt, SALT);

  assertResult(t, result);
});

test('calls defender deploy with createFactoryAddress', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, { createFactoryAddress: CREATE_FACTORY });

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.createFactoryAddress, CREATE_FACTORY);

  assertResult(t, result);
});

test('calls defender deploy with license', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'WithLicense';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {});

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.licenseType, 'MIT');

  assertResult(t, result);
});

test('calls defender deploy - licenseType', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'WithLicense';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {
    licenseType: 'My License Type',
  });

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.licenseType, 'My License Type');

  assertResult(t, result);
});

test('calls defender deploy - verifySourceCode false', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'WithLicense';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {
    verifySourceCode: false,
  });

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.verifySourceCode, false);
  t.is(call.licenseType, undefined);

  assertResult(t, result);
});

test('calls defender deploy - skipLicenseType', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'WithLicense';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {
    skipLicenseType: true,
  });

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.licenseType, undefined);

  assertResult(t, result);
});

test('calls defender deploy - error - licenseType with skipLicenseType true', async t => {
  const { deploy, fakeHre } = t.context;

  const contractName = 'WithLicense';

  const factory = await ethers.getContractFactory(contractName);
  const error = await t.throwsAsync(() =>
    deploy.defenderDeploy(fakeHre, factory, {
      licenseType: 'MIT',
      skipLicenseType: true,
    }),
  );
  t.true(
    error?.message.includes('The `licenseType` option cannot be used when the `skipLicenseType` option is `true`'),
  );
});

test('calls defender deploy - error - licenseType with verifySourceCode false', async t => {
  const { deploy, fakeHre } = t.context;

  const contractName = 'WithLicense';

  const factory = await ethers.getContractFactory(contractName);
  const error = await t.throwsAsync(() =>
    deploy.defenderDeploy(fakeHre, factory, {
      licenseType: 'MIT',
      verifySourceCode: false,
    }),
  );
  t.true(
    error?.message.includes('The `licenseType` option cannot be used when the `verifySourceCode` option is `false`'),
  );
});

test('calls defender deploy - error - unrecognized license', async t => {
  const { deploy, fakeHre } = t.context;

  const contractName = 'UnrecognizedLicense';

  const factory = await ethers.getContractFactory(contractName);
  const error = await t.throwsAsync(() => deploy.defenderDeploy(fakeHre, factory, {}));
  t.true(
    error?.message.includes(
      'SPDX license identifier UnrecognizedId',
    ) && error?.message.includes('does not look like a supported license'),
  );
});

test('calls defender deploy - no contract license', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'NoLicense';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {});

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.licenseType, undefined);

  assertResult(t, result);
});

test('calls defender deploy - unlicensed', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'Unlicensed';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {});

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.licenseType, 'None');

  assertResult(t, result);
});

test('calls defender deploy with constructor args', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'WithConstructor';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {}, 10);

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.constructorBytecode, AbiCoder.defaultAbiCoder().encode(['uint256'], [10]));

  assertResult(t, result);
});

test('calls defender deploy with constructor args with array', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'WithConstructorArray';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {}, [1, 2, 3]);

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.constructorBytecode, AbiCoder.defaultAbiCoder().encode(['uint256[]'], [[1, 2, 3]]));

  assertResult(t, result);
});

test('calls defender deploy with verify false', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, { verifySourceCode: false });

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.verifySourceCode, false);

  assertResult(t, result);
});

test('calls defender deploy with ERC1967Proxy', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractPath = '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
  const contractName = 'ERC1967Proxy';
  // Fixed: getProxyFactory only needs connection, not hre
  const factory = await getProxyFactory(connection);

  const result = await deploy.defenderDeploy(fakeHre, factory, {}, LOGIC_ADDRESS, DATA);
  assertResult(t, result);

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.contractName, contractName);
  t.is(call.constructorBytecode, AbiCoder.defaultAbiCoder().encode(['address', 'bytes'], [LOGIC_ADDRESS, DATA]));
});

test('calls defender deploy with ERC1967Proxy - ignores constructorArgs', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractPath = '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
  const contractName = 'ERC1967Proxy';
  const factory = await getProxyFactory(connection);

  const result = await deploy.defenderDeploy(fakeHre, factory, { constructorArgs: ['foo'] }, LOGIC_ADDRESS, DATA);
  assertResult(t, result);

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.constructorBytecode, AbiCoder.defaultAbiCoder().encode(['address', 'bytes'], [LOGIC_ADDRESS, DATA]));
});

test('calls defender deploy with ERC1967Proxy - ignores empty constructorArgs', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractPath = '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
  const contractName = 'ERC1967Proxy';
  const factory = await getProxyFactory(connection);

  const result = await deploy.defenderDeploy(fakeHre, factory, { constructorArgs: [] }, LOGIC_ADDRESS, DATA);
  assertResult(t, result);

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.constructorBytecode, AbiCoder.defaultAbiCoder().encode(['address', 'bytes'], [LOGIC_ADDRESS, DATA]));
});

test('calls defender deploy with BeaconProxy', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractPath = '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
  const contractName = 'BeaconProxy';
  const factory = await getBeaconProxyFactory(connection);

  const result = await deploy.defenderDeploy(fakeHre, factory, {}, LOGIC_ADDRESS, DATA);
  assertResult(t, result);

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.contractName, contractName);
  t.is(call.constructorBytecode, AbiCoder.defaultAbiCoder().encode(['address', 'bytes'], [LOGIC_ADDRESS, DATA]));
});

test('calls defender deploy with TransparentUpgradeableProxy', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractPath = '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol';
  const contractName = 'TransparentUpgradeableProxy';
  const factory = await getTransparentUpgradeableProxyFactory(connection);

  const result = await deploy.defenderDeploy(fakeHre, factory, {}, LOGIC_ADDRESS, INITIAL_OWNER_ADDRESS, DATA);
  assertResult(t, result);

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.is(call.contractName, contractName);
  t.is(call.constructorBytecode, AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'bytes'],
    [LOGIC_ADDRESS, INITIAL_OWNER_ADDRESS, DATA],
  ));
});

test('calls defender deploy with txOverrides.gasLimit', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, { txOverrides: { gasLimit: 1 } });

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.deepEqual(call.txOverrides, {
    gasLimit: 1,
    gasPrice: undefined,
    maxFeePerGas: undefined,
    maxPriorityFeePerGas: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy with txOverrides.gasPrice', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, { txOverrides: { gasPrice: 1 } });

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.deepEqual(call.txOverrides, {
    gasLimit: undefined,
    gasPrice: '0x1',
    maxFeePerGas: undefined,
    maxPriorityFeePerGas: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy with txOverrides.maxFeePerGas and txOverrides.maxPriorityFeePerGas', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {
    txOverrides: { maxFeePerGas: 100, maxPriorityFeePerGas: '0xa' },
  });

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.deepEqual(call.txOverrides, {
    gasLimit: undefined,
    gasPrice: undefined,
    maxFeePerGas: '0x64',
    maxPriorityFeePerGas: '0xa',
  });

  assertResult(t, result);
});

test('calls defender deploy with external library', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'TokenProxiable';

  const factory = await ethers.getContractFactory(contractName, {
    libraries: {
      SafeMath: EXTERNAL_LIBRARY_ADDRESS,
    },
  });
  const result = await deploy.defenderDeploy(fakeHre, factory, {});

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.truthy(call.libraries);
  t.true(Object.values(call.libraries).includes(EXTERNAL_LIBRARY_ADDRESS));

  assertResult(t, result);
});

test('calls defender deploy with multiple external libraries', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'MultipleExternalLibraries';

  const factory = await ethers.getContractFactory(contractName, {
    libraries: {
      SafeMath: EXTERNAL_LIBRARY_ADDRESS,
      SafeMathV2: EXTERNAL_LIBRARY_2_ADDRESS,
    },
  });
  const result = await deploy.defenderDeploy(fakeHre, factory, {});

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.truthy(call.libraries);
  const libraryValues = Object.values(call.libraries);
  t.true(libraryValues.includes(EXTERNAL_LIBRARY_ADDRESS));
  t.true(libraryValues.includes(EXTERNAL_LIBRARY_2_ADDRESS));

  assertResult(t, result);
});

test('calls defender deploy with metadata', async t => {
  const { spy, deploy, fakeHre } = t.context;

  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {
    metadata: {
      commitHash: '4ae3e0d',
      tag: 'v1.0.0',
      anyOtherField: 'anyValue',
    },
  });

  t.is(spy.callCount, 1);
  const call = spy.firstCall.args[0];
  t.deepEqual(call.metadata, {
    commitHash: '4ae3e0d',
    tag: 'v1.0.0',
    anyOtherField: 'anyValue',
  });

  assertResult(t, result);
});

test('waits until address is available', async t => {
  const getDeployedContractStub = sinon.stub();
  getDeployedContractStub.onFirstCall().returns({
    deploymentId: DEPLOYMENT_ID,
  });
  getDeployedContractStub.onSecondCall().returns({
    deploymentId: DEPLOYMENT_ID,
    txHash: TX_HASH,
  });
  getDeployedContractStub.onThirdCall().returns({
    deploymentId: DEPLOYMENT_ID,
    txHash: TX_HASH,
    address: ADDRESS,
  });

  await testGetDeployedContractPolling(t, getDeployedContractStub, 3);
});

test('waits until txHash is available', async t => {
  const getDeployedContractStub = sinon.stub();
  getDeployedContractStub.onFirstCall().returns({
    deploymentId: DEPLOYMENT_ID,
  });
  getDeployedContractStub.onSecondCall().returns({
    deploymentId: DEPLOYMENT_ID,
    address: ADDRESS,
  });
  getDeployedContractStub.onThirdCall().returns({
    deploymentId: DEPLOYMENT_ID,
    txHash: TX_HASH,
    address: ADDRESS,
  });

  await testGetDeployedContractPolling(t, getDeployedContractStub, 3);
});

async function testGetDeployedContractPolling(t, getDeployedContractStub, expectedCallCount) {
  const fakeChainId = 'goerli';

  const contractName = 'Greeter';

  const defenderClientWaits = {
    deployContract: () => {
      return {
        deploymentId: DEPLOYMENT_ID,
      };
    },
    getDeployedContract: getDeployedContractStub,
  };
  const deployContractSpy = sinon.spy(defenderClientWaits, 'deployContract');

  const fakeConnection = {
    ethers: {
      provider: {
        getTransaction: () => TX_RESPONSE,
      },
      getAddress: address => address,
    },
  };

  const fakeHre = {
    artifacts: hre.artifacts,
    config: hre.config,
    network: {
      provider: { send: async () => fakeChainId },
      connect: async () => fakeConnection,
    },
  };

  const { getNetwork: _getNetwork, ...otherDefenderUtils } = await import('../dist/defender/utils.js');
  const deployPending = await esmock('../dist/defender/deploy.js', {
    '../dist/defender/utils.js': {
      ...otherDefenderUtils,
      getNetwork: () => fakeChainId,
    },
    '../dist/defender/client.js': {
      getDeployClient: () => defenderClientWaits,
    },
    '../dist/utils/etherscan-api.js': {
      getEtherscanAPIConfig: () => {
        return { key: ETHERSCAN_API_KEY };
      },
    },
  });

  const factory = await ethers.getContractFactory(contractName);
  const result = await deployPending.defenderDeploy(fakeHre, factory, { pollingInterval: 1 });

  t.is(deployContractSpy.callCount, 1);
  t.is(getDeployedContractStub.callCount, expectedCallCount);

  t.deepEqual(result, {
    address: ADDRESS,
    txHash: TX_HASH,
    deployTransaction: TX_RESPONSE,
    remoteDeploymentId: DEPLOYMENT_ID,
  });
}