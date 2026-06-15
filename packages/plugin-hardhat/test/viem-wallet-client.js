import test from 'ava';
import hre from 'hardhat';
import { createWalletClient, custom } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const connection = await hre.network.create();
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

let upgrades;

test.after.always(async () => {
  await connection.close();
});

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
});

// A transport is required to construct wallet clients
const stubTransport = custom({ request: async () => undefined });
const connectionTransport = custom({ request: args => connection.provider.request(args) });

test('supports wallet clients with local accounts', async t => {
  // The plugin signs through viem itself, so client-side signing accounts such as viem's
  // privateKeyToAccount are supported: viem signs locally and broadcasts via eth_sendRawTransaction.
  // Uses one of Hardhat's funded default accounts (index 1) so the deployment can be paid for.
  const account = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');
  const publicClient = await connection.viem.getPublicClient();
  const localWallet = createWalletClient({ account, chain: publicClient.chain, transport: connectionTransport });

  const greeter = await upgrades.deployProxy('Greeter', ['Hello from a local account'], {
    client: { wallet: localWallet },
  });

  t.is(await greeter.read.greet(), 'Hello from a local account');

  const greeter2 = await upgrades.upgradeProxy(greeter, 'contracts/GreeterV2.sol:GreeterV2', {
    client: { wallet: localWallet },
  });
  await greeter2.write.resetGreeting();
  t.is(await greeter2.read.greet(), 'Hello World');
});

test('rejects wallet clients without an account', async t => {
  const accountlessWallet = createWalletClient({ transport: stubTransport });

  await t.throwsAsync(() => upgrades.deployProxy('Greeter', ['Hello'], { client: { wallet: accountlessWallet } }), {
    message: /must have an account/,
  });
});
