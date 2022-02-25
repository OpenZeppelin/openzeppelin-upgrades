import { UpgradesError } from './error';
import { EthereumProvider, getCode } from './provider';

/**
 * Tries to determine whether runtime bytecode matches with contract creation code.
 * May return false negatives in some cases, such as contracts that use immutable variables.
 *
 * @param creationCode the creation code that may have deployed a contract
 * @param runtimeBytecode the runtime bytecode that was deployed
 * @returns true if the creation code contains the runtime code
 */
async function compareBytecode(creationCode: string, runtimeBytecode: string) {
  const creationCodeWithoutPrefix = creationCode.replace(/^0x/, '');
  const runtimeBytecodeWithoutPrefix = runtimeBytecode.replace(/^0x/, '');
  return creationCodeWithoutPrefix.includes(runtimeBytecodeWithoutPrefix);
}

/**
 * Compares the creation bytecode with implAddress's runtime bytecode. Throws an error if the former
 * does not contains the latter.
 *
 * @param provider the Ethereum provider
 * @param implAddress the address to get the runtime bytecode from
 * @param creationCode the creation code that may have deployed the contract
 */
export async function compareImplBytecode(provider: EthereumProvider, implAddress: string, creationCode: string) {
  if (!(await compareBytecode(creationCode, await getCode(provider, implAddress)))) {
    throw new UpgradesError(
      `Contract does not match with implementation bytecode deployed at ${implAddress}`,
      () =>
        'The provided contract factory does not match with the bytecode deployed at the implementation address. If you are sure that you are using the correct implementation contract, force the import with the option { force: true }',
    );
  }
}
