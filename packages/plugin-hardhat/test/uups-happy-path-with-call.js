import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;


test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('contracts/GreeterProxiable.sol:GreeterProxiable');
  t.context.GreeterV2 = await ethers.getContractFactory('contracts/GreeterV2Proxiable.sol:GreeterV2Proxiable');
});

test('happy path - call with args', async t => {
  const { Greeter, GreeterV2 } = t.context;
  const signer = await ethers.provider.getSigner();

  const greeter = await upgrades.deployProxy(Greeter, [await signer.getAddress(), 'Hello, Hardhat!'], { kind: 'uups' });

  t.is(await greeter.greet(), 'Hello, Hardhat!');

  await upgrades.upgradeProxy(greeter, GreeterV2, {
    call: { fn: 'setGreeting', args: ['Called during upgrade'] },
  });

  t.is(await greeter.greet(), 'Called during upgrade');
});

test('happy path - call without args', async t => {
  const { Greeter, GreeterV2 } = t.context;
  const signer = await ethers.provider.getSigner();

  const greeter = await upgrades.deployProxy(Greeter, [await signer.getAddress(), 'Hello, Hardhat!'], { kind: 'uups' });

  t.is(await greeter.greet(), 'Hello, Hardhat!');

  await upgrades.upgradeProxy(greeter, GreeterV2, {
    call: 'resetGreeting',
  });

  t.is(await greeter.greet(), 'Hello World');
});
