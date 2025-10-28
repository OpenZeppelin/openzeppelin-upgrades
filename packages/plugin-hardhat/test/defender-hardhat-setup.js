import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;

const { defender } = require('hardhat');

test('creates defender object in hardhat runtime', async t => {
  t.is(typeof defender.proposeUpgradeWithApproval, 'function');
});
