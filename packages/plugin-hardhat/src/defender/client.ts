import { DeployClient } from '@openzeppelin/defender-sdk-deploy-client';
import { NetworkClient } from '@openzeppelin/defender-sdk-network-client';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getDefenderApiKey } from './utils';

export function getNetworkClient(hre: HardhatRuntimeEnvironment): NetworkClient {
  return new NetworkClient(getDefenderApiKey(hre));
}

export function getDeployClient(hre: HardhatRuntimeEnvironment): DeployClient {
  return new DeployClient(getDefenderApiKey(hre));
}
