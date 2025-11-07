import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { defender as defenderFactory } from '@openzeppelin/hardhat-upgrades';
import esmock from 'esmock';
import sinon from 'sinon';

const defender = await defenderFactory(hre, connection);

const ADDR = '0x1';
const TX_HASH = '0x0000000000000000000000000000000000000000000000000000000000000002';

test.before(async t => {
  t.context.NonUpgradeable = await ethers.getContractFactory('NonUpgradeable');
  t.context.WithConstructor = await ethers.getContractFactory('WithConstructor');
  t.context.IsInitializable = await ethers.getContractFactory('IsInitializable');
  t.context.IsInitializableUpgradeable = await ethers.getContractFactory('IsInitializableUpgradeable');
  t.context.IsUUPS = await ethers.getContractFactory('IsUUPS');
  t.context.GreeterProxiable = await ethers.getContractFactory('contracts/GreeterProxiable.sol:GreeterProxiable');

  const { makeDeployContract } = await esmock('../dist/deploy-contract.js', {
    '../dist/utils/index.js': {
      deploy: async () => {
        return {
          address: ADDR,
          txHash: TX_HASH,
          deployTransaction: undefined,
          remoteDeploymentId: 'abc',
        };
      },
    },
  });
  t.context.deployContract = makeDeployContract(hre, true, connection);
});

test.afterEach.always(() => {
  sinon.restore();
});

test('deploy contract', async t => {
  const { deployContract, NonUpgradeable } = t.context;
  const inst = await deployContract(NonUpgradeable);
  t.is(await inst.getAddress(), ADDR);
});

test('deploy contract - defender false', async t => {
  const { deployContract, NonUpgradeable } = t.context;
  const error = await t.throwsAsync(() => deployContract(NonUpgradeable, { useDefenderDeploy: false }));
  t.regex(error.message, /The deployContract function cannot have the `useDefenderDeploy` option disabled./);
});

test('deploy contract - constructor', async t => {
  const { deployContract, WithConstructor } = t.context;
  const inst = await deployContract(WithConstructor, [10]);
  t.is(await inst.getAddress(), ADDR);
});

test('deploy contract - constructor using opts', async t => {
  const { deployContract, WithConstructor } = t.context;

  const error = await t.throwsAsync(() => deployContract(WithConstructor, { constructorArgs: [10] }));
  t.regex(error.message, /The deployContract function does not support the constructorArgs option/);
});

test('deploy contract - constructor using args and opts', async t => {
  const { deployContract, WithConstructor } = t.context;

  const error = await t.throwsAsync(() => deployContract(WithConstructor, [5], { constructorArgs: [10] }));
  t.regex(error.message, /The deployContract function does not support the constructorArgs option/);
});

test('deploy contract - is initializable', async t => {
  const { deployContract, IsInitializable } = t.context;
  const error = await t.throwsAsync(() => deployContract(IsInitializable));
  t.regex(error.message, /Upgradable contracts cannot be deployed using the deployContract function/);
});

test('deploy contract - is initializable upgradeable', async t => {
  const { deployContract, IsInitializableUpgradeable } = t.context;
  const error = await t.throwsAsync(() => deployContract(IsInitializableUpgradeable));
  t.regex(error.message, /Upgradable contracts cannot be deployed using the deployContract function/);
});

test('deploy contract - is UUPSUpgradeable', async t => {
  const { deployContract, IsUUPS } = t.context;
  const error = await t.throwsAsync(() => deployContract(IsUUPS));
  t.regex(error.message, /Upgradable contracts cannot be deployed using the deployContract function/);
});

test('deploy contract - is uups custom', async t => {
  const { deployContract, GreeterProxiable } = t.context;
  const error = await t.throwsAsync(() => deployContract(GreeterProxiable));
  t.regex(error.message, /Upgradable contracts cannot be deployed using the deployContract function/);
});

test('deploy contract - allow unsafe', async t => {
  const { deployContract, IsUUPS } = t.context;
  const inst = await deployContract(IsUUPS, { unsafeAllowDeployContract: true });
  t.is(await inst.getAddress(), ADDR);
});

test('await deployed contract', async t => {
  const { NonUpgradeable } = t.context;

  const precreated = await NonUpgradeable.deploy();

  const { makeDeployContract } = await esmock('../dist/deploy-contract.js', {
    '../dist/utils/index.js': {
      deploy: async () => {
        return {
          address: await precreated.getAddress(),
          txHash: precreated.deploymentTransaction().hash,
          deployTransaction: precreated.deploymentTransaction(),
          remoteDeploymentId: 'abc',
        };
      },
    },
    '../dist/utils/contract-instance.js': {
      getContractInstance: (hre, contract, opts, deployment) => {
        const instance = contract.attach(deployment.address);
        // @ts-ignore
        instance.deploymentTransaction = () => deployment.deployTransaction ?? null;
        return instance;
      },
    },
  });
  const deployContract = makeDeployContract(hre, true, connection);

  const inst = await deployContract(NonUpgradeable);
  t.is(await inst.getAddress(), await precreated.getAddress());
  await inst.waitForDeployment();
});

test('deployed calls wait for deployment', async t => {
  const { NonUpgradeable } = t.context;

  const stub = sinon.stub();

  // just predeploy a contract so that it exists on the network
  const deployed = await NonUpgradeable.deploy();

  const { makeDeployContract } = await esmock('../dist/deploy-contract.js', {
    '../dist/utils/index.js': {
      deploy: async () => {
        return {
          address: await deployed.getAddress(),
          txHash: TX_HASH,
          deployTransaction: undefined,
          remoteDeploymentId: 'abc',
        };
      },
    },
    '../dist/utils/contract-instance.js': {
      getContractInstance: (hre, contract, opts, deployment) => {
        const instance = contract.attach(deployment.address);
        // @ts-ignore
        instance.deploymentTransaction = () => deployment.deployTransaction ?? null;
        const origWait = instance.waitForDeployment.bind(instance);
        instance.waitForDeployment = async () => {
          await stub();
          return await origWait();
        };
        return instance;
      },
    },
  });
  const deployContract = makeDeployContract(hre, true, connection);

  const inst = await deployContract(NonUpgradeable);
  t.is(await inst.getAddress(), await deployed.getAddress());
  await inst.waitForDeployment();

  t.is(stub.callCount, 1);
});
