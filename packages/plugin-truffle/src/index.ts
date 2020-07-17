import { promisify } from 'util';

import { assertUpgradeSafe, getStorageLayout, fetchOrDeploy, getVersionId } from '@openzeppelin/upgrades-core';
import AdminUpgradeabilityProxyArtifact from '@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy.json';

import { TruffleContract, ContractClass, ContractInstance } from './truffle';
import { validateArtifacts } from './validate';

interface Options {
  deployer: Deployer;
}

interface Deployer {
  provider: EthereumProvider;
  deploy(contract: ContractClass, ...args: unknown[]): Promise<ContractInstance>;
}

interface EthereumProvider {
  send(method: 'eth_chainId', params?: []): Promise<string>;
  send(method: 'eth_accounts', params?: []): Promise<string[]>;
  send(method: 'eth_getCode', params: [string, string?]): Promise<string>;
  send(method: string, params?: unknown[]): Promise<unknown>;
}

export async function deployProxy(Contract: ContractClass, args: unknown[], opts: Options) {
  const { deployer } = opts;

  const validations = await validateArtifacts();

  const version = getVersionId(Contract.bytecode);
  assertUpgradeSafe(validations, version);

  const provider = wrapProvider(deployer.provider);
  const impl = await fetchOrDeploy(version, provider, async () => {
    const { address } = await deployer.deploy(Contract);
    const layout = getStorageLayout(validations, version);
    return { address, layout };
  });

  const data = await new Contract('').contract.methods.initialize(...args).encodeABI();
  const sender = Contract.class_defaults.from;
  const AdminUpgradeabilityProxy = await getProxyFactory(Contract);
  const proxy = await deployer.deploy(AdminUpgradeabilityProxy, impl, sender, data);

  Contract.address = proxy.address;
  return Contract.deployed();
}

function getProxyFactory(Contract: ContractClass) {
  const AdminUpgradeabilityProxy = TruffleContract(AdminUpgradeabilityProxyArtifact);
  AdminUpgradeabilityProxy.setProvider(Contract.currentProvider);
  AdminUpgradeabilityProxy.defaults(Contract.class_defaults);
  return AdminUpgradeabilityProxy;
}

function wrapProvider(provider: any): EthereumProvider {
  const web3Send = promisify(provider.send.bind(provider));
  return {
    async send(method: string, params?: unknown[]) {
      const { result, error } = await web3Send({ method, params });
      if (error) {
        throw new Error(error.message);
      } else {
        return result;
      }
    }
  };
}
