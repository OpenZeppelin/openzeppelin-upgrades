import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;


test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('contracts/GreeterProxiable.sol:GreeterProxiable');
  t.context.Invalid = await ethers.getContractFactory('InvalidProxiable');
});

test('invalid upgrade', async t => {
  const { Greeter, Invalid } = t.context;

  const signer = await ethers.provider.getSigner();
  const greeter = await upgrades.deployProxy(Greeter, [await signer.getAddress(), 'Hola mundo!'], { kind: 'uups' });
  await t.throwsAsync(
    () => upgrades.upgradeProxy(greeter, Invalid),
    undefined,
    'Contract `Invalid` is not upgrade safe',
  );
});
