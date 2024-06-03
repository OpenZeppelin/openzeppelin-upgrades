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

const { AbiCoder } = require('ethers');

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

  t.context.deploy = proxyquire('../dist/defender/deploy', {
    './utils': {
      ...require('../dist/defender/utils'),
      getNetwork: () => t.context.fakeChainId,
    },
    './client': {
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
    licenseType: undefined,
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
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
    licenseType: undefined,
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: RELAYER_ID,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
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
    licenseType: undefined,
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: SALT,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
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
    licenseType: undefined,
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: CREATE_FACTORY,
    txOverrides: undefined,
    libraries: undefined,
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
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy - licenseType', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/WithLicense.sol';
  const contractName = 'WithLicense';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {
    licenseType: 'My License Type', // not a valid type, but this just sets the option
  });

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: 'My License Type',
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy - verifySourceCode false', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/WithLicense.sol';
  const contractName = 'WithLicense';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {
    verifySourceCode: false,
  });

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorBytecode: '0x',
    verifySourceCode: false,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy - skipLicenseType', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/WithLicense.sol';
  const contractName = 'WithLicense';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {
    skipLicenseType: true,
  });

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
  });

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
      'SPDX license identifier UnrecognizedId in contracts/UnrecognizedLicense.sol does not look like a supported license for block explorer verification.',
    ),
  );
  t.true(
    error?.message.includes(
      'Use the `licenseType` option to specify a license type, or set the `skipLicenseType` option to `true` to skip.',
    ),
  );
});

test('calls defender deploy - no contract license', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/NoLicense.sol';
  const contractName = 'NoLicense';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {});

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy - unlicensed', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Unlicensed.sol';
  const contractName = 'Unlicensed';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {});

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: 'None',
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
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
    constructorBytecode: AbiCoder.defaultAbiCoder().encode(['uint256'], [10]),
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy with constructor args with array', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Constructor.sol';
  const contractName = 'WithConstructorArray';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {}, [1, 2, 3]);

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: 'MIT',
    constructorBytecode: AbiCoder.defaultAbiCoder().encode(['uint256[]'], [[1, 2, 3]]),
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
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
    constructorBytecode: '0x',
    verifySourceCode: false,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
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
    constructorBytecode: AbiCoder.defaultAbiCoder().encode(['address', 'bytes'], [LOGIC_ADDRESS, DATA]),
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
  });
});

test('calls defender deploy with ERC1967Proxy - ignores constructorArgs', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
  const contractName = 'ERC1967Proxy';
  const factory = await getProxyFactory(hre);

  const result = await deploy.defenderDeploy(fakeHre, factory, { constructorArgs: ['foo'] }, LOGIC_ADDRESS, DATA);
  assertResult(t, result);

  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(artifactsBuildInfo),
    licenseType: 'MIT',
    constructorBytecode: AbiCoder.defaultAbiCoder().encode(['address', 'bytes'], [LOGIC_ADDRESS, DATA]),
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
  });
});

test('calls defender deploy with ERC1967Proxy - ignores empty constructorArgs', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
  const contractName = 'ERC1967Proxy';
  const factory = await getProxyFactory(hre);

  const result = await deploy.defenderDeploy(fakeHre, factory, { constructorArgs: [] }, LOGIC_ADDRESS, DATA);
  assertResult(t, result);

  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(artifactsBuildInfo),
    licenseType: 'MIT',
    constructorBytecode: AbiCoder.defaultAbiCoder().encode(['address', 'bytes'], [LOGIC_ADDRESS, DATA]),
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
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
    constructorBytecode: AbiCoder.defaultAbiCoder().encode(['address', 'bytes'], [LOGIC_ADDRESS, DATA]),
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
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
    constructorBytecode: AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'bytes'],
      [LOGIC_ADDRESS, INITIAL_OWNER_ADDRESS, DATA],
    ),
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: undefined,
  });
});

test('calls defender deploy with txOverrides.gasLimit', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, { txOverrides: { gasLimit: 1 } });

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: {
      gasLimit: 1,
      gasPrice: undefined,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    },
    libraries: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy with txOverrides.gasPrice', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, { txOverrides: { gasPrice: 1 } });

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: {
      gasLimit: undefined,
      gasPrice: '0x1',
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    },
    libraries: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy with txOverrides.maxFeePerGas and txOverrides.maxPriorityFeePerGas', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Greeter.sol';
  const contractName = 'Greeter';

  const factory = await ethers.getContractFactory(contractName);
  const result = await deploy.defenderDeploy(fakeHre, factory, {
    txOverrides: { maxFeePerGas: 100, maxPriorityFeePerGas: '0xa' },
  });

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: {
      gasLimit: undefined,
      gasPrice: undefined,
      maxFeePerGas: '0x64',
      maxPriorityFeePerGas: '0xa',
    },
    libraries: undefined,
  });

  assertResult(t, result);
});

test('calls defender deploy with external library', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/Token.sol';
  const contractName = 'TokenProxiable';

  const factory = await ethers.getContractFactory(contractName, {
    libraries: {
      SafeMath: EXTERNAL_LIBRARY_ADDRESS,
    },
  });
  const result = await deploy.defenderDeploy(fakeHre, factory, {});

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: {
      'contracts/ExternalLibraries.sol:SafeMath': EXTERNAL_LIBRARY_ADDRESS,
    },
  });

  assertResult(t, result);
});

test('calls defender deploy with multiple external libraries', async t => {
  const { spy, deploy, fakeHre, fakeChainId } = t.context;

  const contractPath = 'contracts/MultipleExternalLibraries.sol';
  const contractName = 'MultipleExternalLibraries';

  const factory = await ethers.getContractFactory(contractName, {
    libraries: {
      SafeMath: EXTERNAL_LIBRARY_ADDRESS,
      SafeMathV2: EXTERNAL_LIBRARY_2_ADDRESS,
    },
  });
  const result = await deploy.defenderDeploy(fakeHre, factory, {});

  const buildInfo = await hre.artifacts.getBuildInfo(`${contractPath}:${contractName}`);
  sinon.assert.calledWithExactly(spy, {
    contractName: contractName,
    contractPath: contractPath,
    network: fakeChainId,
    artifactPayload: JSON.stringify(buildInfo),
    licenseType: undefined,
    constructorBytecode: '0x',
    verifySourceCode: true,
    relayerId: undefined,
    salt: undefined,
    createFactoryAddress: undefined,
    txOverrides: undefined,
    libraries: {
      'contracts/ExternalLibraries.sol:SafeMath': EXTERNAL_LIBRARY_ADDRESS,
      'contracts/ExternalLibraries.sol:SafeMathV2': EXTERNAL_LIBRARY_2_ADDRESS,
    },
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
  const { fakeHre, fakeChainId } = t.context;

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

  const deployPending = proxyquire('../dist/defender/deploy', {
    './utils': {
      ...require('../dist/defender/utils'),
      getNetwork: () => fakeChainId,
    },
    './client': {
      getDeployClient: () => defenderClientWaits,
    },
    '../utils/etherscan-api': {
      getEtherscanAPIConfig: () => {
        return { key: ETHERSCAN_API_KEY };
      },
    },
  });

  const factory = await ethers.getContractFactory(contractName);
  const result = await deployPending.defenderDeploy(fakeHre, factory, { pollingInterval: 1 }); // poll in 1 ms

  t.is(deployContractSpy.callCount, 1);
  t.is(getDeployedContractStub.callCount, expectedCallCount);

  t.deepEqual(result, {
    address: ADDRESS,
    txHash: TX_HASH,
    deployTransaction: TX_RESPONSE,
    remoteDeploymentId: DEPLOYMENT_ID,
  });
}
