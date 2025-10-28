import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;
const { getVersion, getContractNameAndRunValidation } = require('@openzeppelin/upgrades-core');

const hre = require('hardhat');
import { readValidations } from '../dist/utils/validations.js';

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  const { ethers } = hre;
  t.context.validations = await readValidations(hre);
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterMulti = await ethers.getContractFactory('GreeterMultiPragma');
});

test('multiple compiler runs', async t => {
  const { validations, Greeter, GreeterMulti } = t.context;
  const GreeterVersion = getVersion(Greeter.bytecode);
  const GreeterMultiVersion = getVersion(GreeterMulti.bytecode);

  const [, GreeterRunValidation] = getContractNameAndRunValidation(validations, GreeterVersion);
  const [, GreeterMultiRunValidation] = getContractNameAndRunValidation(validations, GreeterMultiVersion);

  t.notDeepEqual(GreeterRunValidation, GreeterMultiRunValidation);
});
