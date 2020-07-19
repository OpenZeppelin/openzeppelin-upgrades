import type { ContractFactory, Contract } from 'ethers';

export type UpgradeFunction = (proxyAddress: string, ImplFactory: ContractFactory) => Promise<Contract>;
export type DeployFunction = (ImplFactory: ContractFactory, args: unknown[]) => Promise<Contract>;
