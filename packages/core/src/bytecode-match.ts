import { UpgradesError } from './error';
import { EthereumProvider, getCode } from './provider';

/**
 * Determines whether runtime bytecode matches with contract creation code.
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
 * Compares the creation bytecode with implAddress's runtime bytecode. If the former contains the latter or if
 * the force option is true, return the runtime bytecode. Otherwise throw an error.
 *
 * @param provider the Ethereum provider
 * @param implAddress the address to get the runtime bytecode from
 * @param creationCode the creation code that may have deployed the contract
 * @param force whether to force the match
 * @returns the runtime bytecode if the creation code contains the runtime code or force is true
 */
export async function getAndCompareImplBytecode(
  provider: EthereumProvider,
  implAddress: string,
  creationCode: string,
  force?: boolean,
) {
  const runtimeBytecode = await getCode(provider, implAddress);
  if (force || (await compareBytecode(creationCode, runtimeBytecode))) {
    return runtimeBytecode;
  } else {
    throw new UpgradesError(
      `Contract does not match with implementation bytecode deployed at ${implAddress}`,
      () =>
        'The provided contract factory does not match with the bytecode deployed at the implementation address. If you are sure that you are using the correct implementation contract, force the import with the option { force: true }',
    );
  }
}
