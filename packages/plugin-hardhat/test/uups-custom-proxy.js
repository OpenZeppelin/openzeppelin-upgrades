import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';
import AccessManagerArtifact from '@openzeppelin/contracts/build/contracts/AccessManager.json' with { type: 'json' };

let upgrades;

import { deploy } from '../dist/utils/deploy.js';

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2Proxiable');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3Proxiable');
  t.context.AccessManagedProxy = await ethers.getContractFactory('AccessManagedProxy');
  
  // Import AccessManager from OpenZeppelin Contracts
  const AccessManager = await ethers.getContractFactory(
    AccessManagerArtifact.abi,
    AccessManagerArtifact.bytecode
  );
  
  const [admin, anon] = await ethers.getSigners();
  t.context.admin = admin;
  t.context.anon = anon;
  t.context.acMgr = await AccessManager.deploy(admin);
});

async function deployWithExtraProxyArgs(hre, opts, factory, ...args) {
  const allArgs = [...args, ...(opts.proxyExtraConstructorArgs || [])];
  return deploy(hre, opts, factory, ...allArgs);
}

test('custom uups proxy factory and deploy function', async t => {
  const { Greeter, GreeterV2, GreeterV3, AccessManagedProxy, acMgr, admin, anon } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], {
    kind: 'uups',
    proxyExtraConstructorArgs: [await acMgr.getAddress()],
    deployFunction: deployWithExtraProxyArgs,
    proxyFactory: AccessManagedProxy,
  });

  // By default it calls from admin address, so, it works fine
  let greet = await greeter.connect(admin).greet();
  t.is(greet, 'Hello, Hardhat!');
  // But fails when called from other user
  let e = await t.throwsAsync(() => greeter.connect(anon).greet());
  t.true(e.message.includes('AccessManagedUnauthorized'), e.message);

  // Upgrades work well, because the call executed from the default signer that is the admin
  const greeter2 = await upgrades.upgradeProxy(greeter, GreeterV2);
  await greeter2.waitForDeployment();
  await greeter2.resetGreeting();

  // Upgrades don't break the access control
  e = await t.throwsAsync(() => greeter2.connect(anon).resetGreeting());
  t.true(e.message.includes('AccessManagedUnauthorized'), e.message);

  const greeter3ImplAddr = await upgrades.prepareUpgrade(await greeter.getAddress(), GreeterV3);
  const greeter3 = GreeterV3.attach(greeter3ImplAddr);
  const version3 = await greeter3.version();
  t.is(version3, 'V3');
});