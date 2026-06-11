import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.create();
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

let upgrades;
let publicClient;

test.after.always(async () => {
  await connection.close();
});

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
  publicClient = await connection.viem.getPublicClient();
});

async function assertTransactionOverrides(t, fromBlockNumber, expected) {
  const toBlockNumber = await publicClient.getBlockNumber();
  t.true(toBlockNumber > fromBlockNumber);

  for (let i = fromBlockNumber + 1n; i <= toBlockNumber; i++) {
    const block = await publicClient.getBlock({ blockNumber: i, includeTransactions: true });
    t.is(block.transactions.length, 1); // Assume and assert that tests run with only one tx per block
    const [tx] = block.transactions;

    for (const [key, value] of Object.entries(expected)) {
      t.is(tx[key], value, `unexpected ${key} in block ${i}`);
    }
  }
}

test('gas and fee options apply to all transactions', async t => {
  const fromBlockNumber = await publicClient.getBlockNumber();

  await upgrades.deployProxy('Greeter', ['Hello'], {
    kind: 'transparent',
    redeployImplementation: 'always',
    gas: 5_000_000n,
    maxFeePerGas: 100_000_000_000n,
    maxPriorityFeePerGas: 2_000_000_000n,
  });

  await assertTransactionOverrides(t, fromBlockNumber, {
    gas: 5_000_000n,
    maxFeePerGas: 100_000_000_000n,
    maxPriorityFeePerGas: 2_000_000_000n,
  });
});

test('gas options apply to upgrade transactions', async t => {
  const greeter = await upgrades.deployProxy('contracts/Greeter.sol:GreeterProxiable', ['Hello'], { kind: 'uups' });

  const fromBlockNumber = await publicClient.getBlockNumber();

  await upgrades.upgradeProxy(greeter, 'contracts/GreeterV2.sol:GreeterV2Proxiable', {
    redeployImplementation: 'always',
    gas: 4_000_000n,
  });

  await assertTransactionOverrides(t, fromBlockNumber, { gas: 4_000_000n });
});
