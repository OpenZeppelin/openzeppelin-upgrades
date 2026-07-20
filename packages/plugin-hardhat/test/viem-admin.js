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

test('transferProxyAdminOwnership', async t => {
  const [deployer, newOwner] = await connection.viem.getWalletClients();

  const greeter = await upgrades.deployProxy('Greeter', ['Hello'], { kind: 'transparent' });
  const adminAddress = await upgrades.erc1967.getAdminAddress(greeter.address);

  t.is(
    await publicClient.readContract({ address: adminAddress, abi: ownableAbi, functionName: 'owner' }),
    getAddress(deployer.account.address),
  );

  const fromBlockNumber = await publicClient.getBlockNumber();

  await upgrades.admin.transferProxyAdminOwnership(greeter.address, newOwner.account.address, deployer, {
    silent: true,
    gas: 500_000n,
  });

  t.is(
    await publicClient.readContract({ address: adminAddress, abi: ownableAbi, functionName: 'owner' }),
    getAddress(newOwner.account.address),
  );

  // The gas option applies to the ownership transfer transaction. Scan only blocks mined by
  // this call so concurrent tests sharing the connection cannot make `latest` look wrong.
  const toBlockNumber = await publicClient.getBlockNumber();
  t.true(toBlockNumber > fromBlockNumber);
  let sawTransferTx = false;
  for (let i = fromBlockNumber + 1n; i <= toBlockNumber; i++) {
    const block = await publicClient.getBlock({ blockNumber: i, includeTransactions: true });
    for (const tx of block.transactions) {
      if (tx.gas === 500_000n) {
        sawTransferTx = true;
      }
    }
  }
  t.true(sawTransferTx);
});

test('changeProxyAdmin is not supported by v5 admins', async t => {
  // OpenZeppelin Contracts 5.x proxy admins do not support changing the proxy admin,
  // so this is expected to revert. It mirrors the ethers-based API, where v4 admins do support it.
  const greeter = await upgrades.deployProxy('Greeter', ['Hello'], { kind: 'transparent' });
  const [, newAdmin] = await connection.viem.getWalletClients();

  await t.throwsAsync(() => upgrades.admin.changeProxyAdmin(greeter.address, newAdmin.account.address));
});
