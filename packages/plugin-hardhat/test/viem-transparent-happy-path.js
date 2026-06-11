import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.create();
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

/** @type {import('@openzeppelin/hardhat-upgrades/viem').HardhatViemUpgrades} */
let upgrades;

test.after.always(async () => {
  await connection.close();
});

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
});

test('happy path', async t => {
  const greeter = await upgrades.deployProxy('Greeter', ['Hello, Hardhat!'], { kind: 'transparent' });

  t.true(greeter.address.startsWith('0x'));
  t.is(await greeter.read.greet(), 'Hello, Hardhat!');

  await greeter.write.setGreeting(['Hello, viem!']);
  t.is(await greeter.read.greet(), 'Hello, viem!');

  const greeter2 = await upgrades.upgradeProxy(greeter, 'contracts/GreeterV2.sol:GreeterV2');
  t.is(greeter2.address, greeter.address);

  await greeter2.write.resetGreeting();
  t.is(await greeter2.read.greet(), 'Hello World');

  const greeter3ImplAddr = await upgrades.prepareUpgrade(greeter.address, 'GreeterV3');
  const greeter3 = await connection.viem.getContractAt('GreeterV3', greeter3ImplAddr);
  t.is(await greeter3.read.version(), 'V3');
});

test('erc1967 getters', async t => {
  const greeter = await upgrades.deployProxy('Greeter', ['Hello'], { kind: 'transparent' });

  const implAddress = await upgrades.erc1967.getImplementationAddress(greeter.address);
  const adminAddress = await upgrades.erc1967.getAdminAddress(greeter.address);

  const publicClient = await connection.viem.getPublicClient();
  t.not(await publicClient.getCode({ address: implAddress }), undefined);
  t.not(await publicClient.getCode({ address: adminAddress }), undefined);
});
