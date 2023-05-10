import '@openzeppelin/hardhat-upgrades/dist/type-extensions';
import {
  getAdminAddress,
  getImplementationAddress,
  isBeaconProxy,
  isTransparentProxy,
} from '@openzeppelin/upgrades-core';
import { ContractFactory, ethers } from 'ethers';
import { FormatTypes } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { PlatformDeployOptions, UpgradeOptions } from '../utils';
import { getNetwork, enablePlatform, getPlatformClient } from './utils';
import { deployImplForUpgrade } from '../prepare-upgrade';

export interface UpgradeProposalResponse {
  proposalId: string;
  url?: string;
  txResponse?: ethers.providers.TransactionResponse;
}

export type ProposeUpgradeFunction = (
  proxyAddress: string,
  contractNameOrImplFactory: string | ContractFactory,
  opts?: ProposalOptions,
) => Promise<UpgradeProposalResponse>;

export interface ProposalOptions extends UpgradeOptions, PlatformDeployOptions {
  approvalProcessId?: string;
}

export function makeProposeUpgrade(hre: HardhatRuntimeEnvironment, platformModule: boolean): ProposeUpgradeFunction {
  return async function proposeUpgrade(proxyAddress, contractNameOrImplFactory, opts = {}) {
    opts = enablePlatform(hre, platformModule, opts);

    const client = getPlatformClient(hre);
    const network = await getNetwork(hre);

    if (await isBeaconProxy(hre.network.provider, proxyAddress)) {
      throw new Error(`Beacon proxy is not currently supported with platform.proposeUpgrade()`);
    } else {
      // try getting the implementation address so that it will give an error if it's not a transparent/uups proxy
      await getImplementationAddress(hre.network.provider, proxyAddress);
    }

    let proxyAdmin = undefined;
    if (await isTransparentProxy(hre.network.provider, proxyAddress)) {
      // use the erc1967 admin address as the proxy admin
      proxyAdmin = await getAdminAddress(hre.network.provider, proxyAddress);
    }

    const implFactory =
      typeof contractNameOrImplFactory === 'string'
        ? await hre.ethers.getContractFactory(contractNameOrImplFactory)
        : contractNameOrImplFactory;
    const abi = implFactory.interface.format(FormatTypes.json) as string;

    const deployedImpl = await deployImplForUpgrade(hre, proxyAddress, implFactory, {
      getTxResponse: true,
      ...opts,
    });

    const txResponse = deployedImpl.txResponse;
    const newImplementation = deployedImpl.impl;

    const upgradeProposalResponse = await client.Upgrade.upgrade({
      proxyAddress: proxyAddress,
      proxyAdminAddress: proxyAdmin,
      newImplementationABI: abi,
      newImplementationAddress: newImplementation,
      network: network,
      approvalProcessId: opts.approvalProcessId,
    });

    return {
      proposalId: upgradeProposalResponse.proposalId,
      url: upgradeProposalResponse.externalUrl,
      txResponse,
    };
  };
}
