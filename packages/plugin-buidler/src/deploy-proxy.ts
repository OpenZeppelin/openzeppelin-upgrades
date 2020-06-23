import { ethers } from '@nomiclabs/buidler';
import { BuidlerPluginError } from '@nomiclabs/buidler/plugins';
import crypto from 'crypto';
import fs from 'fs';

import { isUpgradeSafe, getErrors } from '@openzeppelin/upgrades-core';

export async function deployProxy(contractName: string, args: unknown[]) {
  const validations = JSON.parse(fs.readFileSync('cache/validations.json', 'utf8'));

  if (!isUpgradeSafe(validations, contractName)) {
    for (const error of getErrors(validations, contractName)) {
      console.log(`There is a ${error.kind} in the contract`);
    }
    throw new BuidlerPluginError('This contract is not upgrade safe');
  }

  const ImplFactory = await ethers.getContractFactory(contractName);
  // const version = getVersionId(ImplFactory.bytecode.slice(2));

  // TODO: reuse deployed impls
  const impl = await ImplFactory.deploy();

  // TODO: support choice of initializer function? support overloaded initialize function
  const data = impl.interface.functions.initialize.encode(args);
  const ProxyFactory = await ethers.getContractFactory('UpgradeabilityProxy');
  const proxy = await ProxyFactory.deploy(impl.address, data);

  const inst = impl.attach(proxy.address);
  // inst.deployTransaction = proxy.deployTransaction;
  return inst;
}

function getVersionId(bytecode: string) {
  const hash = crypto.createHash('sha256');
  hash.update(bytecode);
  return hash.digest().toString('base64');
}
