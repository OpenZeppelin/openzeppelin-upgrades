import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory } from 'ethers';

import {
    getUnlinkedBytecode,
    getVersion,
    getContractNameAndRunValidation
} from '@openzeppelin/upgrades-core';

import { readValidations } from './validations';

export async function detectUUPS(
    hre: HardhatRuntimeEnvironment,
    ImplFactory: ContractFactory,
): Promise<boolean> {
    const validations = await readValidations(hre);
    const unlinkedBytecode = getUnlinkedBytecode(validations, ImplFactory.bytecode);
    const version = getVersion(unlinkedBytecode, ImplFactory.bytecode);

    const [contractName, runValidation] = getContractNameAndRunValidation(validations, version);
    const c = runValidation[contractName];

    const selfAndInheritedMethods = c.methods.concat(...c.inherit.map(name => runValidation[name].methods));

    //If the contracts contains the 'upgradeTo function, kind:uups is true'
    if (selfAndInheritedMethods.includes('upgradeTo(address)')) {
       return true
    }
    //If no 'upgradeTo function exists, return false
    else return false;
}