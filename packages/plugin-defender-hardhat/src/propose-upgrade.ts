import '@openzeppelin/hardhat-upgrades/dist/type-extensions';
import { getChainId, ValidationOptions } from '@openzeppelin/upgrades-core';
import { AdminClient, ProposalResponse } from 'defender-admin-client';
import type { ContractFactory } from 'ethers';
import { FormatTypes } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { fromChainId } from 'defender-base-client';

export type ProposeUpgradeFunction = (
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts?: ProposalOptions,
) => Promise<ProposalResponse>;

export interface ProposalOptions extends ValidationOptions {
  title?: string;
  description?: string;
}

export function makeProposeUpgrade(hre: HardhatRuntimeEnvironment): ProposeUpgradeFunction {
  return async function proposeUpgrade(proxyAddress, ImplFactory, opts = {}) {
    if (!hre.config.defender) {
      throw new Error(`Missing Defender API key and secret in hardhat config`);
    }
    const client = new AdminClient(hre.config.defender);

    const chainId = await getChainId(hre.network.provider);
    const network = fromChainId(chainId);
    if (network === undefined) {
      throw new Error(`Network ${chainId} is not supported in Defender Admin`);
    }

    const { title, description } = opts;
    const newImplementation = await hre.upgrades.prepareUpgrade(proxyAddress, ImplFactory);
    const contract = { address: proxyAddress, network, abi: ImplFactory.interface.format(FormatTypes.json) as string };
    return client.proposeUpgrade({ newImplementation, title, description }, contract);
  };
}
