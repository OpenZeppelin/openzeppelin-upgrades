import '@openzeppelin/hardhat-upgrades/dist/type-extensions';
import {
  getChainId,
  getImplementationAddress,
  isBeacon,
  isBeaconProxy,
  ValidationOptions,
} from '@openzeppelin/upgrades-core';
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
  proxyAdmin?: string;
  multisig?: string;
  multisigType?: 'Gnosis Safe' | 'Gnosis Multisig' | 'EOA';
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

    const { title, description, proxyAdmin, multisig, multisigType, ...moreOpts } = opts;

    if (await isBeaconProxy(hre.network.provider, proxyAddress)) {
      throw new Error(`Beacon proxy is not currently supported with defender.proposeUpgrade()`);
    } else if (await isBeacon(hre.network.provider, proxyAddress)) {
      throw new Error(`Beacon is not currently supported with defender.proposeUpgrade()`);
    } else {
      // try getting the implementation address so that it will give an error if it's not a transparent/uups proxy
      await getImplementationAddress(hre.network.provider, proxyAddress);
    }

    const newImplementation = await hre.upgrades.prepareUpgrade(proxyAddress, ImplFactory, moreOpts);
    const contract = { address: proxyAddress, network, abi: ImplFactory.interface.format(FormatTypes.json) as string };
    return client.proposeUpgrade(
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
  };
}
