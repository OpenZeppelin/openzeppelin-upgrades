import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

/** @type {import('@openzeppelin/hardhat-upgrades').HardhatUpgrades} */
let upgrades;

test.after.always(async () => {
  await connection.close();
});

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('contracts/GreeterV2.sol:GreeterV2');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3');
});

test('happy path', async t => {
  const { Greeter, GreeterV2, GreeterV3 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });

  const greeter2 = await upgrades.upgradeProxy(greeter, GreeterV2);
  await greeter2.waitForDeployment();
  await greeter2.resetGreeting();

  const greeter3ImplAddr = await upgrades.prepareUpgrade(await greeter.getAddress(), GreeterV3);
  const greeter3 = GreeterV3.attach(greeter3ImplAddr);
  const version3 = await greeter3.version();
  t.is(version3, 'V3');
});
