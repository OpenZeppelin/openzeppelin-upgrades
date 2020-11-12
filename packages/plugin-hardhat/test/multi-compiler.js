const { getVersion, getContractNameAndRunValidation } = require('@openzeppelin/upgrades-core');
const test = require('ava');

const hre = require('hardhat');
const { readValidations } = require('../src/validations');

test.before(async t => {
  const { ethers } = hre;
  t.context.validations = await readValidations(hre);
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterMulti = await ethers.getContractFactory('GreeterMultiPragma');
});

test('multiple compiler runs', async t => {
  const { validations } = t.context;
  const GreeterVersion = getVersion(t.context.Greeter.bytecode);
  const GreeterMultiVersion = getVersion(t.context.GreeterMulti.bytecode);

  const [, GreeterRunValidation] = getContractNameAndRunValidation(validations, GreeterVersion);
  const [, GreeterMultiRunValidation] = getContractNameAndRunValidation(validations, GreeterMultiVersion);

  t.notDeepEqual(GreeterRunValidation, GreeterMultiRunValidation);
});
