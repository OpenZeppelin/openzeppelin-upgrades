import '../type-extensions.js';
import {
  getAdminAddress,
  getImplementationAddress,
  isBeaconProxy,
  isTransparentProxy,
} from '@openzeppelin/upgrades-core';
import { ContractFactory, ethers } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import { EthereumProvider } from 'hardhat/types/providers';

import { DefenderDeployOptions, UpgradeOptions } from '../utils/index.js';
import { getNetwork, enableDefender } from './utils.js';
import { deployImplForUpgrade } from '../prepare-upgrade.js';
import { getDeployClient } from './client.js';

export interface UpgradeProposalResponse {
  proposalId: string;
  url?: string;
  txResponse?: ethers.TransactionResponse;
}

export type ProposeUpgradeWithApprovalFunction = (
  proxyAddress: string,
  contractNameOrImplFactory: string | ContractFactory,
  opts?: ProposalOptions,
) => Promise<UpgradeProposalResponse>;

export interface ProposalOptions extends UpgradeOptions, DefenderDeployOptions {
  approvalProcessId?: string;
}

export function makeProposeUpgradeWithApproval(
  hre: HardhatRuntimeEnvironment,
  defenderModule: boolean,
  connection: NetworkConnection,
): ProposeUpgradeWithApprovalFunction {
  return async function proposeUpgradeWithApproval(proxyAddress, contractNameOrImplFactory, opts = {}) {
    opts = enableDefender(hre, defenderModule, opts);

    const client = getDeployClient(hre);
    const network = await getNetwork(hre, connection);
    const { ethers } = connection;
    const provider = ethers.provider as unknown as EthereumProvider;

    if (await isBeaconProxy(provider, proxyAddress)) {
      throw new Error(`Beacon proxy is not currently supported with defender.proposeUpgradeWithApproval()`);
    } else {
      // try getting the implementation address so that it will give an error if it's not a transparent/uups proxy
      await getImplementationAddress(provider, proxyAddress);
    }

    let proxyAdmin = undefined;
    if (await isTransparentProxy(provider, proxyAddress)) {
      // use the erc1967 admin address as the proxy admin
      proxyAdmin = await getAdminAddress(provider, proxyAddress);
    }

    const implFactory =
      typeof contractNameOrImplFactory === 'string'
        ? await ethers.getContractFactory(contractNameOrImplFactory)
        : contractNameOrImplFactory;
    const abi = implFactory.interface.formatJson();

    const deployedImpl = await deployImplForUpgrade(hre, proxyAddress, implFactory, {
      getTxResponse: true,
      ...opts,
    }, connection);

    const txResponse = deployedImpl.txResponse;
    const newImplementation = deployedImpl.impl;

    const upgradeProposalResponse = await client.upgradeContract({
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
