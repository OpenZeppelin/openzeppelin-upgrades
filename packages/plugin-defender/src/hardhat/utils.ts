import { ProposalResponse } from 'defender-admin-client';

const BaseUrl = 'https://defender.openzeppelin.com';

export function getProposalUrl(proposal: ProposalResponse): string {
  return `${BaseUrl}/#/admin/contracts/${proposal.contractId}/proposals/${proposal.proposalId}`;
}
