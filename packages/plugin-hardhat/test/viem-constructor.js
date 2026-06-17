import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.create();
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

let upgrades;

// WithConstructor has a required `uint256` constructor argument that sets an immutable `value`,
// annotated upgrade-safe. It is the viem counterpart of test/constructor.js.
const CONTRACT = 'contracts/WithConstructor.sol:WithConstructor';

test.after.always(async () => {
  await connection.close();
});

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
});

test('deploys with constructorArgs (happy path)', async t => {
  const proxy = await upgrades.deployProxy(CONTRACT, [], { constructorArgs: [17n], initializer: false });
  t.is(await proxy.read.value(), 17n);
});

test('deployProxy throws when a required constructor argument is omitted', async t => {
  // Must fail fast at encode time like the ethers API, rather than broadcasting a deploy that
  // reverts on-chain with a generic RPC error.
  await t.throwsAsync(() => upgrades.deployProxy(CONTRACT, [], { initializer: false }), {
    message: /constructor argument/i,
  });
});

test('deployImplementation throws when a required constructor argument is omitted', async t => {
  await t.throwsAsync(() => upgrades.deployImplementation(CONTRACT), {
    message: /constructor argument/i,
  });
});
