import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
import { defender as defenderFactory } from '@openzeppelin/hardhat-upgrades';

const defender = await defenderFactory(hre, connection);

test('creates defender object in hardhat runtime', async t => {
  t.is(typeof defender.proposeUpgradeWithApproval, 'function');
});
