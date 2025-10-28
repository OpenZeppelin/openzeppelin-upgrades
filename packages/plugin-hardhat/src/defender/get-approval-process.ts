import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';

import { getNetwork } from './utils.js';
import { getDeployClient } from './client.js';
import { ApprovalProcessResponse } from '@openzeppelin/defender-sdk-deploy-client';

export interface ApprovalProcess {
  approvalProcessId: string;
  address?: string;
  viaType?: ApprovalProcessResponse['viaType'];
}

export type GetDeployApprovalProcessFunction = () => Promise<ApprovalProcess>;
export type GetUpgradeApprovalProcessFunction = () => Promise<ApprovalProcess>;

export function makeGetDeployApprovalProcess(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): GetDeployApprovalProcessFunction {
  return async function getDeployApprovalProcess() {
    return await getApprovalProcess(hre, 'deploy', connection);
  };
}

export function makeGetUpgradeApprovalProcess(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): GetUpgradeApprovalProcessFunction {
  return async function getUpgradeApprovalProcess() {
    return await getApprovalProcess(hre, 'upgrade', connection);
  };
}

async function getApprovalProcess(hre: HardhatRuntimeEnvironment, kind: 'deploy' | 'upgrade', connection: NetworkConnection) {
  const client = getDeployClient(hre);
  const network = await getNetwork(hre, connection);

  let response: ApprovalProcessResponse;
  switch (kind) {
    case 'deploy':
      response = await client.getDeployApprovalProcess(network);
      break;
    case 'upgrade':
      response = await client.getUpgradeApprovalProcess(network);
      break;
    // default case should be unreachable
  }

  if (response.network !== network) {
    // This should not happen
    throw new Error(
      `Returned an approval process for network ${response.network} which does not match current network ${network}`,
    );
  }

  return {
    approvalProcessId: response.approvalProcessId,
    address: response.via,
    viaType: response.viaType,
  };
}
