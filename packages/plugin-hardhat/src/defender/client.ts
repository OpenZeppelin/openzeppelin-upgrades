import { DeployClient } from '@openzeppelin/defender-sdk-deploy-client';
import { NetworkClient } from '@openzeppelin/defender-sdk-network-client';
import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';

import { getDefenderApiKey } from './utils.js';

export function getNetworkClient(hre: HardhatRuntimeEnvironment): NetworkClient {
  return new NetworkClient(getDefenderApiKey(hre));
}

export function getDeployClient(hre: HardhatRuntimeEnvironment): DeployClient {
  return new DeployClient(getDefenderApiKey(hre));
}
