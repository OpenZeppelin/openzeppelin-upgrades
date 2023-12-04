import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getNetwork, getDeployClient } from './utils';

export interface ApprovalProcess {
  approvalProcessId: string;
  address?: string;
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

  const response = kind === 'deploy' ? await client.getDeployApprovalProcess(network) : await client.getUpgradeApprovalProcess(network);

  if (response.network !== network) {
    // This should not happen
    throw new Error(
      `Returned an approval process for network ${response.network} which does not match current network ${network}`
    );
  }

  return {
    approvalProcessId: response.approvalProcessId,
    address: response.via,
  };
}
