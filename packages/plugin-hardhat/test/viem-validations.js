import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.create();
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

let upgrades;

test.after.always(async () => {
  await connection.close();
});

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
});

test('validateImplementation - invalid', async t => {
  await t.throwsAsync(() => upgrades.validateImplementation('Invalid'), {
    message: /Invalid` is not upgrade safe/,
  });
});

test('validateImplementation - valid', async t => {
  await t.notThrowsAsync(() => upgrades.validateImplementation('Greeter'));
});

test('validateUpgrade with contract names', async t => {
  await t.notThrowsAsync(() => upgrades.validateUpgrade('Greeter', 'contracts/GreeterV2.sol:GreeterV2', { kind: 'transparent' }));

  await t.throwsAsync(
    () => upgrades.validateUpgrade('contracts/Greeter.sol:GreeterProxiable', 'InvalidProxiable', { kind: 'uups' }),
    { message: /InvalidProxiable` is not upgrade safe/ },
  );
});

test('validateUpgrade with proxy address', async t => {
  const greeter = await upgrades.deployProxy('Greeter', ['Hola!'], { kind: 'transparent' });
  await t.notThrowsAsync(() => upgrades.validateUpgrade(greeter.address, 'contracts/GreeterV2.sol:GreeterV2'));
});

test('invalid deployProxy', async t => {
  await t.throwsAsync(() => upgrades.deployProxy('Invalid', { kind: 'transparent' }), {
    message: /Invalid` is not upgrade safe/,
  });
});

test('invalid upgradeProxy', async t => {
  const greeter = await upgrades.deployProxy('Greeter', ['Hola mundo!'], { kind: 'transparent' });
  await t.throwsAsync(() => upgrades.upgradeProxy(greeter, 'Invalid'), { message: /is not upgrade safe/ });
});

// The remaining implementation-validating entries must also reject an unsafe contract, so every
// public entry that deploys or upgrades an implementation is confirmed to route through validation.
test('invalid deployImplementation', async t => {
  await t.throwsAsync(() => upgrades.deployImplementation('Invalid'), { message: /Invalid` is not upgrade safe/ });
});

test('invalid deployBeacon', async t => {
  await t.throwsAsync(() => upgrades.deployBeacon('Invalid'), { message: /Invalid` is not upgrade safe/ });
});

test('invalid upgradeBeacon', async t => {
  const beacon = await upgrades.deployBeacon('Greeter');
  await t.throwsAsync(() => upgrades.upgradeBeacon(beacon.address, 'Invalid'), { message: /is not upgrade safe/ });
});

test('invalid prepareUpgrade', async t => {
  const greeter = await upgrades.deployProxy('Greeter', ['Hola!'], { kind: 'transparent' });
  await t.throwsAsync(() => upgrades.prepareUpgrade(greeter.address, 'Invalid'), { message: /is not upgrade safe/ });
});
