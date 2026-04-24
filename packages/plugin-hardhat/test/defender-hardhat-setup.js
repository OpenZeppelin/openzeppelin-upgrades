import test from 'ava';
import hre from 'hardhat';
import { defender as defenderFactory } from '@openzeppelin/hardhat-upgrades';

const connection = await hre.network.connect();
const defender = await defenderFactory(hre, connection);

test.after.always(async () => {
  await connection.close();
});

test('creates defender object in hardhat runtime', async t => {
  t.is(typeof defender.proposeUpgradeWithApproval, 'function');
});
