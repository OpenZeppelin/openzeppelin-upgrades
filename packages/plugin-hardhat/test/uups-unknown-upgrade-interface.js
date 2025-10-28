import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;
const sinon = require('sinon');

const hre = require('hardhat');

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.GreeterProxiable40Fallback = await ethers.getContractFactory('GreeterProxiable40Fallback');
  t.context.GreeterProxiable40FallbackV2 = await ethers.getContractFactory('GreeterProxiable40FallbackV2');

  t.context.GreeterProxiable40FallbackString = await ethers.getContractFactory('GreeterProxiable40FallbackString');
  t.context.GreeterProxiable40FallbackStringV2 = await ethers.getContractFactory('GreeterProxiable40FallbackStringV2');
});

test('unknown upgrades interface version due to fallback returning non-string', async t => {
  const { GreeterProxiable40Fallback, GreeterProxiable40FallbackV2 } = t.context;

  const greeter = await upgrades.deployProxy(GreeterProxiable40Fallback, ['Hello, Hardhat!'], { kind: 'uups' });
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const debugStub = sinon.stub();
  import upgradeProxy from '../dist/upgrade-proxy.js';.makeUpgradeProxy(hre, false, debugStub);

  const greeter2 = await upgradeProxy(greeter, GreeterProxiable40FallbackV2);

  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');

  t.true(
    debugStub.calledWith(
      `Unexpected type for UPGRADE_INTERFACE_VERSION at address ${await greeter.getAddress()}. Expected a string`,
    ),
  );
});

test('unknown upgrades interface version due to fallback returning string', async t => {
  const { GreeterProxiable40FallbackString, GreeterProxiable40FallbackStringV2 } = t.context;

  const greeter = await upgrades.deployProxy(GreeterProxiable40FallbackString, ['Hello, Hardhat!'], { kind: 'uups' });
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const debugStub = sinon.stub();
  import upgradeProxy from '../dist/upgrade-proxy.js';.makeUpgradeProxy(hre, false, debugStub);

  const greeter2 = await upgradeProxy(greeter, GreeterProxiable40FallbackStringV2);
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');

  t.true(
    debugStub.calledWith(
      `Unknown UPGRADE_INTERFACE_VERSION Hello, Hardhat! for proxy at ${await greeter.getAddress()}. Expected 5.0.0`,
    ),
  );
});
