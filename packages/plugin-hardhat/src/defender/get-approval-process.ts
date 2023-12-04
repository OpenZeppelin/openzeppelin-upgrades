import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getNetwork, getDeployClient } from './utils';
import { ApprovalProcessResponse } from '@openzeppelin/defender-sdk-deploy-client';

export interface ApprovalProcess {
  approvalProcessId: string;
  address?: string;
  viaType?: ApprovalProcessResponse['viaType'];
}

export type GetDeployApprovalProcessFunction = () => Promise<ApprovalProcess>;
export type GetUpgradeApprovalProcessFunction = () => Promise<ApprovalProcess>;

export function makeGetDeployApprovalProcess(hre: HardhatRuntimeEnvironment): GetDeployApprovalProcessFunction {
  return async function getDeployApprovalProcess() {
    return await getApprovalProcess(hre, 'deploy');
  };
}

export function makeGetUpgradeApprovalProcess(hre: HardhatRuntimeEnvironment): GetUpgradeApprovalProcessFunction {
  return async function getUpgradeApprovalProcess() {
    return await getApprovalProcess(hre, 'upgrade');
  };
}

async function getApprovalProcess(hre: HardhatRuntimeEnvironment, kind: 'deploy' | 'upgrade') {
  const client = getDeployClient(hre);
  const network = await getNetwork(hre);

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
