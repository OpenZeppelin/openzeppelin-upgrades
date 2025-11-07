import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;


test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('contracts/GreeterProxiable.sol:GreeterProxiable');
});

test('uups with initialOwner option', async t => {
  const { Greeter } = t.context;

  const initialOwner = await ethers.provider.getSigner(1);
  const signer = await ethers.provider.getSigner();

  await t.throwsAsync(upgrades.deployProxy(Greeter, [await signer.getAddress(), 'hello'], { initialOwner: initialOwner.address }), {
    message: /The `initialOwner` option is not supported for this kind of proxy \('uups'\)/,
  });
});
