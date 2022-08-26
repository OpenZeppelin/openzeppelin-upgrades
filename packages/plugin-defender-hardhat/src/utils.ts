import { AdminClient } from 'defender-admin-client';
import { fromChainId, Network } from 'defender-base-client';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export function getAdminClient(hre: HardhatRuntimeEnvironment): AdminClient {
  if (!hre.config.defender) {
    throw new Error(`Missing Defender API key and secret in hardhat config`);
  }
  return new AdminClient(hre.config.defender);
}

export async function getNetwork(hre: HardhatRuntimeEnvironment): Promise<Network> {
  const id = await hre.network.provider.send('eth_chainId', []);
  const chainId = parseInt(id.replace(/^0x/, ''), 16);
  const network = fromChainId(chainId);
  if (network === undefined) {
    throw new Error(`Network ${chainId} is not supported in Defender`);
  }
  return network;
}
