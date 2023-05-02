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
import { getNetwork, getAdminClient, enablePlatform } from './utils';
import { deployImplForUpgrade } from '../prepare-upgrade';

export interface ExtendedProposalResponse extends ProposalResponse {
  txResponse?: ethers.providers.TransactionResponse;
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
    opts = enablePlatform(hre, platformModule, opts);

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
    const contract = { address: proxyAddress, network, abi: implFactory.interface.format(FormatTypes.json) as string };

    const deployedImpl = await deployImplForUpgrade(hre, proxyAddress, implFactory, {
      getTxResponse: true,
      ...moreOpts,
    });

    const txResponse = deployedImpl.txResponse;
    const newImplementation = deployedImpl.impl;

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
    };
  };
}
