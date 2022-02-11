import { UpgradesError } from './error';
import { ProxyDeployment } from './manifest';
import { EthereumProvider, getCode } from './provider';
import { logWarning } from './utils/log';

/**
 * Determines whether runtime bytecode at an address matches with contract creation code.
 *
 * @param provider the Ethereum provider
 * @param addr the address to get the runtime bytecode from
 * @param creationCode the creation code that may have deployed the contract
 * @returns true if the creation code contains the runtime code
 */
async function isBytecodeMatch(provider: EthereumProvider, addr: string, creationCode: string) {
  const implBytecode = await getCode(provider, addr);
  return compareBytecode(creationCode, implBytecode);
}

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

interface ProxyCreationCodes {
  UUPSProxy: string;
  TransparentProxy: string;
  BeaconProxy: string;
}

/**
 * Determines the kind of proxy at an address by comparing its runtime bytecode with some possible proxy creation codes.
 *
 * @param provider the Ethereum provider
 * @param proxyAddress the proxy address
 * @param proxyCreationCodes possible proxy creation codes
 * @param kind proxy kind option specified by the user. Will only be used if the kind cannot be determined from the runtime bytecode.
 * @returns
 */
export async function detectProxyKindFromBytecode(
  provider: EthereumProvider,
  proxyAddress: string,
  proxyCreationCodes: ProxyCreationCodes,
  kind?: string,
) {
  let importKind: ProxyDeployment['kind'];
  if (await isBytecodeMatch(provider, proxyAddress, proxyCreationCodes.UUPSProxy)) {
    importKind = 'uups';
  } else if (await isBytecodeMatch(provider, proxyAddress, proxyCreationCodes.TransparentProxy)) {
    importKind = 'transparent';
  } else if (await isBytecodeMatch(provider, proxyAddress, proxyCreationCodes.BeaconProxy)) {
    importKind = 'beacon';
  } else {
    if (kind === undefined) {
      throw new UpgradesError(
        `Cannot determine the proxy kind at address ${proxyAddress}. Specify the kind option for the importProxy function.`,
      );
    } else {
      if (kind !== 'uups' && kind !== 'transparent' && kind !== 'beacon') {
        throw new UpgradesError(
          `kind must be uups, transparent, or beacon`,
          () => `Specify a supported kind of proxy in the options for the importProxy function`,
        );
      }
      importKind = kind;
    }
  }

  if (kind !== undefined && kind !== importKind) {
    logWarning(
      `Detected proxy kind '${importKind}' at address ${proxyAddress} which differs from specified kind '${kind}'`,
      [
        `The kind of proxy detected at the given address differs from the kind specified in the importProxy function's options.`,
        `The proxy will be imported as kind '${importKind}'.`,
      ],
    );
  }
  return importKind;
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
