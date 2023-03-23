import '@openzeppelin/hardhat-upgrades/dist/type-extensions';
import {
  getImplementationAddress,
  isBeaconProxy,
  isTransparentOrUUPSProxy,
  isTransparentProxy,
} from '@openzeppelin/upgrades-core';
import { ProposalResponse } from 'defender-admin-client';
import { ContractFactory, ethers } from 'ethers';
import { FormatTypes } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { PlatformSupportedOptions, UpgradeOptions } from '../utils';
import { getNetwork, getAdminClient, setPlatformDefaults } from './utils';
import type { VerificationResponse } from './verify-deployment';

export interface ExtendedProposalResponse extends ProposalResponse {
  txResponse?: ethers.providers.TransactionResponse;
  verificationResponse?: VerificationResponse;
}

export type ProposeUpgradeFunction = (
  proxyAddress: string,
  contractNameOrImplFactory: string | ContractFactory,
  opts?: ProposalOptions,
) => Promise<ExtendedProposalResponse>;

export interface ProposalOptions extends UpgradeOptions, PlatformSupportedOptions {
  title?: string;
  description?: string;
  proxyAdmin?: string;
  multisig?: string;
  multisigType?: 'Gnosis Safe' | 'Gnosis Multisig' | 'EOA';
  bytecodeVerificationReferenceUrl?: string;
}

export function makeProposeUpgrade(hre: HardhatRuntimeEnvironment, platformModule: boolean): ProposeUpgradeFunction {
  return async function proposeUpgrade(proxyAddress, contractNameOrImplFactory, opts = {}) {
    setPlatformDefaults(platformModule, opts);

    const client = getAdminClient(hre);
    const network = await getNetwork(hre);

    const { title, description, proxyAdmin, multisig, multisigType, ...moreOpts } = opts;

    if (await isBeaconProxy(hre.network.provider, proxyAddress)) {
      throw new Error(`Beacon proxy is not currently supported with defender.proposeUpgrade()`);
    } else if (
      !multisig &&
      (await isTransparentOrUUPSProxy(hre.network.provider, proxyAddress)) &&
      !(await isTransparentProxy(hre.network.provider, proxyAddress))
    ) {
      throw new Error(`Multisig address is a required property for UUPS proxies`);
    } else {
      // try getting the implementation address so that it will give an error if it's not a transparent/uups proxy
      await getImplementationAddress(hre.network.provider, proxyAddress);
    }

    const implFactory =
      typeof contractNameOrImplFactory === 'string'
        ? await hre.ethers.getContractFactory(contractNameOrImplFactory)
        : contractNameOrImplFactory;
    const contractName = typeof contractNameOrImplFactory === 'string' ? contractNameOrImplFactory : undefined;
    const contract = { address: proxyAddress, network, abi: implFactory.interface.format(FormatTypes.json) as string };

    const prepareUpgradeResult = await hre.upgrades.prepareUpgrade(proxyAddress, implFactory, {
      getTxResponse: true,
      ...moreOpts,
    });

    let txResponse;
    let newImplementation: string;

    if (typeof prepareUpgradeResult === 'string') {
      newImplementation = prepareUpgradeResult;
    } else {
      txResponse = prepareUpgradeResult;
      // The txResponse is a create2 transaction, so the deployment address is not easily retrievable from it.
      // Instead, run the prepareUpgrade again but this time adjust the options to request the address and ensure it does not attempt another deployment.
      const fetchedAddress = await hre.upgrades.prepareUpgrade(proxyAddress, implFactory, {
        getTxResponse: false,
        useDeployedImplementation: true,
        ...moreOpts,
      });
      if (typeof fetchedAddress !== 'string') {
        throw new Error('Broken invariant: prepareUpgrade should return a string since getTxResponse is false');
      }
      newImplementation = fetchedAddress;
    }

    const verificationResponse =
      contractName && opts.bytecodeVerificationReferenceUrl
        ? await hre.platform.verifyDeployment(newImplementation, contractName, opts.bytecodeVerificationReferenceUrl)
        : undefined;

    const proposalResponse = await client.proposeUpgrade(
      {
        newImplementation,
        title,
        description,
        proxyAdmin,
        via: multisig,
        viaType: multisigType,
      },
      contract,
    );

    return {
      ...proposalResponse,
      txResponse,
      verificationResponse,
    };
  };
}
