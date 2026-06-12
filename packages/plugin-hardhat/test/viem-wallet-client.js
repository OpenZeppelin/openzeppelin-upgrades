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

// A transport is required to construct wallet clients, but the guards reject the clients
// before any request is sent
const stubTransport = custom({ request: async () => undefined });

test('rejects wallet clients with local accounts', async t => {
  // The plugin signs through the network connection, so client-side signing accounts
  // such as viem's privateKeyToAccount are not supported
  const localWallet = createWalletClient({
    account: privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000001'),
    transport: stubTransport,
  });

  await t.throwsAsync(() => upgrades.deployProxy('Greeter', ['Hello'], { client: { wallet: localWallet } }), {
    message: /'local' accounts are not supported/,
  });
});

test('rejects wallet clients without an account', async t => {
  const accountlessWallet = createWalletClient({ transport: stubTransport });

  await t.throwsAsync(() => upgrades.deployProxy('Greeter', ['Hello'], { client: { wallet: accountlessWallet } }), {
    message: /must have an account/,
  });
});
