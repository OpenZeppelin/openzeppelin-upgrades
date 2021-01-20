import '@openzeppelin/hardhat-upgrades/src/type-extensions';
import { getChainId, ValidationOptions } from '@openzeppelin/upgrades-core';
import { AdminClient, ProposalResponse } from 'defender-admin-client';
import type { ContractFactory } from 'ethers';
import { FormatTypes } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { fromChainId } from './network';
import { getProposalUrl } from './utils';

export type ProposeUpgradeFunction = (
  proxyAddress: string,
  ImplFactory: ContractFactory,
  opts?: ValidationOptions & { title?: string; description?: string },
) => Promise<ProposalResponse & { url: string }>;

export function makeProposeUpgrade(hre: HardhatRuntimeEnvironment): ProposeUpgradeFunction {
  return async function proposeUpgrade(proxyAddress, ImplFactory, opts = {}) {
    if (!hre.config.defender) {
      throw new Error(`Missing Defender API key and secret in hardhat config`);
    }
    const client = new AdminClient(hre.config.defender);

    const chainId = await getChainId(hre.network.provider);
    const network = fromChainId(chainId);
    if (!network) {
      throw new Error(`Network ${chainId} is not supported in Defender Admin`);
    }

    const nextImpl = await hre.upgrades.prepareUpgrade(proxyAddress, ImplFactory);
    const contract = { address: proxyAddress, network, abi: ImplFactory.interface.format(FormatTypes.json) as string };
    const proposal = await client.proposeUpgrade({ newImplementation: nextImpl, ...opts }, contract);
    return { ...proposal, url: getProposalUrl(proposal) };
  };
}
