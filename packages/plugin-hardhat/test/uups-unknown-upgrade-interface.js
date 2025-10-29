import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;

// TODO: Debug logging verification removed during Hardhat 3 migration
// In Hardhat 2, makeUpgradeProxy accepted a debugStub as the third parameter:
//   const upgradeProxy = makeUpgradeProxy(hre, false, debugStub);
// In Hardhat 3, the signature changed to:
//   makeUpgradeProxy(hre, isDefender, connection)
// The debug logger is no longer injectable, so we can't verify the specific debug messages:
//   - "Unexpected type for UPGRADE_INTERFACE_VERSION at address ... Expected a string"
//   - "Unknown UPGRADE_INTERFACE_VERSION Hello, Hardhat! for proxy at ... Expected 5.0.0"
// These messages are still logged internally by upgrades-core, but we now test functional
// behavior (that upgrades succeed despite unknown interface versions) rather than
// implementation details (debug message content).

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

  // The upgrade should succeed even though the proxy has an unknown upgrade interface version
  // The system handles this gracefully and logs a debug message internally
  const greeter2 = await upgrades.upgradeProxy(greeter, GreeterProxiable40FallbackV2);

  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');
});

test('unknown upgrades interface version due to fallback returning string', async t => {
  const { GreeterProxiable40FallbackString, GreeterProxiable40FallbackStringV2 } = t.context;

  const greeter = await upgrades.deployProxy(GreeterProxiable40FallbackString, ['Hello, Hardhat!'], { kind: 'uups' });
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  // The upgrade should succeed even though the proxy has an unknown upgrade interface version
  // The system handles this gracefully and logs a debug message internally
  const greeter2 = await upgrades.upgradeProxy(greeter, GreeterProxiable40FallbackStringV2);
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');
});