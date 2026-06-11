import test from 'ava';
import hre from 'hardhat';
import { getAddress, parseAbi } from 'viem';

const connection = await hre.network.create();
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

const ownableAbi = parseAbi(['function owner() view returns (address)']);

let upgrades;
let publicClient;

test.after.always(async () => {
  await connection.close();
});

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
  publicClient = await connection.viem.getPublicClient();
});

async function getProxyAdminOwner(proxyAddress) {
  const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
  return publicClient.readContract({ address: adminAddress, abi: ownableAbi, functionName: 'owner' });
}

test('client option determines the deployer account', async t => {
  const [deployer, other] = await connection.viem.getWalletClients();

  // By default the first wallet client signs, and becomes the owner of the proxy admin
  const greeter = await upgrades.deployProxy('Greeter', ['Hello'], { kind: 'transparent' });
  t.is(await getProxyAdminOwner(greeter.address), getAddress(deployer.account.address));

  // With the client option, the given wallet client signs instead
  const greeter2 = await upgrades.deployProxy('Greeter', ['Hello'], {
    kind: 'transparent',
    client: { wallet: other },
  });
  t.is(await getProxyAdminOwner(greeter2.address), getAddress(other.account.address));

  // The returned instance writes with the given wallet client
  await greeter2.write.setGreeting(['Hola']);
  t.is(await greeter2.read.greet(), 'Hola');
});

test('initialOwner option', async t => {
  const [, , initialOwner] = await connection.viem.getWalletClients();

  const greeter = await upgrades.deployProxy('Greeter', ['Hello'], {
    kind: 'transparent',
    initialOwner: initialOwner.account.address,
  });
  t.is(await getProxyAdminOwner(greeter.address), getAddress(initialOwner.account.address));
});

test('beacon initialOwner and client options', async t => {
  const [deployer, other] = await connection.viem.getWalletClients();

  const beacon = await upgrades.deployBeacon('Greeter');
  t.is(await beacon.read.owner(), getAddress(deployer.account.address));

  const beacon2 = await upgrades.deployBeacon('Greeter', { client: { wallet: other } });
  t.is(await beacon2.read.owner(), getAddress(other.account.address));

  const beacon3 = await upgrades.deployBeacon('Greeter', { initialOwner: other.account.address });
  t.is(await beacon3.read.owner(), getAddress(other.account.address));
});
