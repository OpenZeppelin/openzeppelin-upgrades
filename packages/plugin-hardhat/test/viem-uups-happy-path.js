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

test('happy path', async t => {
  const greeter = await upgrades.deployProxy('contracts/Greeter.sol:GreeterProxiable', ['Hello, Hardhat!'], { kind: 'uups' });

  t.is(await greeter.read.greet(), 'Hello, Hardhat!');

  // The proxy of a uups deployment has no admin
  const adminAddress = await upgrades.erc1967.getAdminAddress(greeter.address);
  t.is(BigInt(adminAddress), 0n);

  const greeter2 = await upgrades.upgradeProxy(greeter, 'contracts/GreeterV2.sol:GreeterV2Proxiable');
  t.is(greeter2.address, greeter.address);

  await greeter2.write.resetGreeting();
  t.is(await greeter2.read.greet(), 'Hello World');
});

test('happy path with call', async t => {
  const greeter = await upgrades.deployProxy('contracts/Greeter.sol:GreeterProxiable', ['Hello, Hardhat!'], { kind: 'uups' });

  const greeter2 = await upgrades.upgradeProxy(greeter, 'contracts/GreeterV2.sol:GreeterV2Proxiable', {
    call: { fn: 'setGreeting', args: ['Called during upgrade'] },
  });

  t.is(await greeter2.read.greet(), 'Called during upgrade');
});

test('deployImplementation and upgrade validation', async t => {
  const implAddress = await upgrades.deployImplementation('contracts/Greeter.sol:GreeterProxiable');
  t.true(implAddress.startsWith('0x'));

  const publicClient = await connection.viem.getPublicClient();
  t.not(await publicClient.getCode({ address: implAddress }), undefined);

  // Deploying again reuses the same implementation
  t.is(await upgrades.deployImplementation('contracts/Greeter.sol:GreeterProxiable'), implAddress);

  // redeployImplementation: 'always' deploys a new one
  const newImplAddress = await upgrades.deployImplementation('contracts/Greeter.sol:GreeterProxiable', {
    redeployImplementation: 'always',
  });
  t.not(newImplAddress, implAddress);
});
