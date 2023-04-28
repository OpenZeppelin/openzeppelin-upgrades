import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ContractFactory, Contract, ethers } from 'ethers';
import assert from 'assert';

import { deploy, DeployContractOptions, DeployTransaction } from './utils';
import { DeployData, getDeployData } from './utils/deploy-impl';
import { enablePlatform, waitForDeployment } from './platform/utils';
import {
  Deployment,
  RemoteDeploymentId,
  getContractNameAndRunValidation,
  inferProxyKind,
  UpgradesError,
} from '@openzeppelin/upgrades-core';

export interface DeployContractFunction {
  (Contract: ContractFactory, args?: unknown[], opts?: DeployContractOptions): Promise<Contract>;
  (Contract: ContractFactory, opts?: DeployContractOptions): Promise<Contract>;
}

interface DeployedContract {
  address: string;
  txResponse?: ethers.providers.TransactionResponse;
  remoteDeploymentId?: string;
}

export async function deployNonUpgradeableContract(
  hre: HardhatRuntimeEnvironment,
  Contract: ContractFactory,
  opts: DeployContractOptions,
): Promise<DeployedContract> {
  const deployData = await getDeployData(hre, Contract, opts);

  if (!opts.unsafeAllowDeployContract) {
    assertNonUpgradeable(deployData);
  }

  const deployment: Required<Deployment & DeployTransaction> & RemoteDeploymentId = await deploy(
    hre,
    opts,
    Contract,
    ...deployData.fullOpts.constructorArgs,
  );

  const address = deployment.address;
  const txResponse = deployment.deployTransaction;
  const remoteDeploymentId = deployment.remoteDeploymentId;
  return { address, txResponse, remoteDeploymentId: remoteDeploymentId };
}

function assertNonUpgradeable(deployData: DeployData) {
  const [fullContractName, runValidation] = getContractNameAndRunValidation(deployData.validations, deployData.version);
  const c = runValidation[fullContractName];
  const inherit = c.inherit;
  if (hasInitializable(inherit) || inferProxyKind(deployData.validations, deployData.version) === 'uups') {
    throw new UpgradesError(
      `The contract ${fullContractName} looks like an upgradeable contract.`,
      () =>
        'Upgradable contracts cannot be deployed using the deployContract function. Use deployProxy, deployBeacon, or deployImplementation.\n' +
        'If this is not intended to be an upgradeable contract, set the unsafeAllowDeployContract option to true and run the deployContract function again.',
    );
  }
}

/**
 * Whether inherit has any contract that ends with ":Initializable"
 * @param inherit an array of fully qualified contract names
 * @return true if inherit has any contract that ends with ":Initializable"
 */
function hasInitializable(inherit: string[]) {
  return inherit.some(c => c.endsWith(':Initializable'));
}

export function makeDeployContract(hre: HardhatRuntimeEnvironment, platformModule: boolean): DeployContractFunction {
  return async function deployContract(
    Contract,
    args: unknown[] | DeployContractOptions = [],
    opts: DeployContractOptions = {},
  ) {
    if (!Array.isArray(args)) {
      opts = args;
      args = [];
    }

    opts = enablePlatform(hre, platformModule, opts);

    if (!opts.platform) {
      throw new Error(`The ${deployContract.name} function can only be used with the \`platform\` module or option.`);
    }

    if (opts.constructorArgs !== undefined) {
      throw new Error(
        `The ${deployContract.name} function does not support the constructorArgs option. Pass in constructor arguments using the format: deployContract(MyContract, [ 'my arg' ]);`,
      );
    }
    opts.constructorArgs = args;

    const deployed = await deployNonUpgradeableContract(hre, Contract, opts);

    const inst = Contract.attach(deployed.address);
    // @ts-ignore Won't be readonly because inst was created through attach.
    inst.deployTransaction = deployed.txResponse;
    if (opts.platform && deployed.remoteDeploymentId !== undefined) {
      inst.deployed = async () => {
        assert(deployed.remoteDeploymentId !== undefined);
        await waitForDeployment(hre, opts, inst.address, deployed.remoteDeploymentId);
        return inst;
      };
    }
    return inst;
  };
}
