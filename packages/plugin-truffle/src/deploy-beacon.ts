import {
  ContractClass,
  ContractInstance,
  deploy,
  deployBeaconImpl,
  getUpgradeableBeaconFactory,
  Options,
  withDefaults,
} from './utils';

export async function deployBeacon(Contract: ContractClass, opts: Options = {}): Promise<ContractInstance> {
  const { impl } = await deployBeaconImpl(Contract, opts);

  const { deployer } = withDefaults(opts);
  const UpgradeableBeaconFactory = getUpgradeableBeaconFactory(Contract);
  const beaconDeployment = await deploy(deployer, UpgradeableBeaconFactory, impl);

  const beaconContract = new UpgradeableBeaconFactory(beaconDeployment.address);
  beaconContract.transactionHash = beaconDeployment.txHash;
  return beaconContract;
}
