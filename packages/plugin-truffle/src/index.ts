import { promisify } from 'util';

import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  getVersion,
  Manifest,
  getImplementationAddress,
  getChainId,
  EthereumProvider,
} from '@openzeppelin/upgrades-core';
import AdminUpgradeabilityProxyArtifact from '@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy.json';

import { TruffleContract, ContractClass, ContractInstance, TruffleProvider } from './truffle';
import { validateArtifacts } from './validate';

interface Options {
  deployer?: Deployer;
}

interface Deployer {
  provider: TruffleProvider;
  deploy(contract: ContractClass, ...args: unknown[]): Promise<ContractInstance>;
}

declare const config: { provider: TruffleProvider };

const defaultDeployer: Deployer = {
  get provider() {
    return config.provider;
  },
  async deploy(Contract: ContractClass, ...args: unknown[]): Promise<ContractInstance> {
    return Contract.new(...args);
  },
};

export async function deployProxy(
  Contract: ContractClass,
  args: unknown[],
  opts: Options = {},
): Promise<ContractInstance> {
  const { deployer = defaultDeployer } = opts;

  const validations = await validateArtifacts();

  const version = getVersion(Contract.bytecode);
  assertUpgradeSafe(validations, version.validation);

  const provider = wrapProvider(deployer.provider);
  const impl = await fetchOrDeploy(version.deployment, provider, async () => {
    const { address } = await deployer.deploy(Contract);
    const layout = getStorageLayout(validations, version.validation);
    return { address, layout };
  });

  const data = await new Contract('').contract.methods.initialize(...args).encodeABI();
  const sender = Contract.class_defaults.from;
  const AdminUpgradeabilityProxy = await getProxyFactory(Contract);
  const proxy = await deployer.deploy(AdminUpgradeabilityProxy, impl, sender, data);

  Contract.address = proxy.address;
  return Contract.deployed();
}

export async function upgradeProxy(
  proxyAddress: string,
  Contract: ContractClass,
  opts: Options = {},
): Promise<ContractInstance> {
  const { deployer = defaultDeployer } = opts;
  const provider = wrapProvider(deployer.provider);

  const validations = await validateArtifacts();

  const version = getVersion(Contract.bytecode);
  assertUpgradeSafe(validations, version.validation);

  const AdminUpgradeabilityProxy = await getProxyFactory(Contract);
  const proxy = new AdminUpgradeabilityProxy(proxyAddress);

  const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
  const manifest = new Manifest(await getChainId(provider));
  const deployment = await manifest.getDeploymentFromAddress(currentImplAddress);

  const layout = getStorageLayout(validations, version.validation);
  assertStorageUpgradeSafe(deployment.layout, layout);

  const nextImpl = await fetchOrDeploy(version.deployment, provider, async () => {
    const { address } = await deployer.deploy(Contract);
    return { address, layout };
  });

  await proxy.upgradeTo(nextImpl);

  Contract.address = proxy.address;
  return Contract.deployed();
}

function getProxyFactory(Contract: ContractClass) {
  const AdminUpgradeabilityProxy = TruffleContract(AdminUpgradeabilityProxyArtifact);
  AdminUpgradeabilityProxy.setProvider(Contract.currentProvider);
  AdminUpgradeabilityProxy.defaults(Contract.class_defaults);
  return AdminUpgradeabilityProxy;
}

function wrapProvider(provider: TruffleProvider): EthereumProvider {
  const web3Send = promisify(provider.send.bind(provider));
  return {
    async send(method: string, params?: unknown[]) {
      const { result, error } = await web3Send({ method, params });
      if (error) {
        throw new Error(error.message);
      } else {
        return result;
      }
    },
  };
}
