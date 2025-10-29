import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;

const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('Greeter');
});

test('transferProxyAdminOwnership - wrong signer', async t => {
  // we need to deploy a proxy so we have a Proxy Admin
  const { Greeter } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });

  const signer = await ethers.provider.getSigner(1);

  const proxyAddress = await greeter.getAddress();

  await t.throwsAsync(
    () => upgrades.admin.transferProxyAdminOwnership(proxyAddress, testAddress, signer),
    { message: /0x118cdaa7/ }, // bytes4(keccak256('OwnableUnauthorizedAccount(address)'))
  );
});
