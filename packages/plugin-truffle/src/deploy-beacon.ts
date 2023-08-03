import {
  ContractClass,
  ContractInstance,
  deploy,
  deployBeaconImpl,
  getUpgradeableBeaconFactory,
  DeployBeaconOptions,
  withDefaults,
} from './utils';

export async function deployBeacon(Contract: ContractClass, opts: DeployBeaconOptions = {}): Promise<ContractInstance> {
  const { impl } = await deployBeaconImpl(Contract, opts);

  const { deployer } = withDefaults(opts);
  const UpgradeableBeaconFactory = getUpgradeableBeaconFactory(Contract);
  const beaconDeployment = await deploy(deployer, opts, UpgradeableBeaconFactory, impl);

  const beaconContract = new UpgradeableBeaconFactory(beaconDeployment.address);
  beaconContract.transactionHash = beaconDeployment.txHash;
  return beaconContract;
}
