import { promisify } from 'util';

import {
  assertUpgradeSafe,
  assertStorageUpgradeSafe,
  getStorageLayout,
  fetchOrDeploy,
  fetchOrDeployAdmin,
  getVersion,
  Manifest,
  getImplementationAddress,
  getAdminAddress,
  EthereumProvider,
} from '@openzeppelin/upgrades-core';
import AdminUpgradeabilityProxyArtifact from '@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy.json';
import ProxyAdminArtifact from '@openzeppelin/upgrades-core/artifacts/ProxyAdmin.json';

import { TruffleContract, ContractClass, ContractInstance, TruffleProvider, getTruffleConfig } from './truffle';
import { validateArtifacts } from './validate';

interface Options {
  deployer?: Deployer;
}

interface Deployer {
  provider: TruffleProvider;
  deploy(contract: ContractClass, ...args: unknown[]): Promise<ContractInstance>;
}

const defaultDeployer: Deployer = {
  get provider() {
    return getTruffleConfig().provider;
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

  const validations = await validateArtifacts(getTruffleConfig().contracts_build_directory);

  const version = getVersion(Contract.bytecode);
  assertUpgradeSafe(validations, version);

  const provider = wrapProvider(deployer.provider);
  const impl = await fetchOrDeploy(version, provider, async () => {
    const { address } = await deployer.deploy(Contract);
    const layout = getStorageLayout(validations, version);
    return { address, layout };
  });

  const AdminFactory = await getProxyAdminFactory(Contract);
  const adminAddress = await fetchOrDeployAdmin(provider, () => deployer.deploy(AdminFactory));

  const data = await new Contract('').contract.methods.initialize(...args).encodeABI();
  const AdminUpgradeabilityProxy = await getProxyFactory(Contract);
  const proxy = await deployer.deploy(AdminUpgradeabilityProxy, impl, adminAddress, data);

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

  const validations = await validateArtifacts(getTruffleConfig().contracts_build_directory);

  const version = getVersion(Contract.bytecode);
  assertUpgradeSafe(validations, version);

  const AdminFactory = await getProxyAdminFactory(Contract);
  const admin = new AdminFactory(await getAdminAddress(provider, proxyAddress));

  const currentImplAddress = await getImplementationAddress(provider, proxyAddress);
  const manifest = await Manifest.forNetwork(provider);
  const deployment = await manifest.getDeploymentFromAddress(currentImplAddress);

  const layout = getStorageLayout(validations, version);
  assertStorageUpgradeSafe(deployment.layout, layout);

  const nextImpl = await fetchOrDeploy(version, provider, async () => {
    const { address } = await deployer.deploy(Contract);
    return { address, layout };
  });

  await admin.upgrade(proxyAddress, nextImpl);

  Contract.address = proxyAddress;
  return Contract.deployed();
}

function getProxyFactory(Contract: ContractClass) {
  const AdminUpgradeabilityProxy = TruffleContract(AdminUpgradeabilityProxyArtifact);
  AdminUpgradeabilityProxy.setProvider(Contract.currentProvider);
  AdminUpgradeabilityProxy.defaults(Contract.class_defaults);
  return AdminUpgradeabilityProxy;
}

function getProxyAdminFactory(Contract: ContractClass) {
  const ProxyAdmin = TruffleContract(ProxyAdminArtifact);
  ProxyAdmin.setProvider(Contract.currentProvider);
  ProxyAdmin.defaults(Contract.class_defaults);
  return ProxyAdmin;
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
