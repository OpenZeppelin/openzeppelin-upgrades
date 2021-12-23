import {
  ContractAddressOrInstance,
  ContractClass,
  ContractInstance,
  deployBeaconImpl,
  getContractAddress,
  getUpgradeableBeaconFactory,
  Options,
} from './utils';

export async function upgradeBeacon(
  beacon: ContractAddressOrInstance,
  Contract: ContractClass,
  opts: Options = {},
): Promise<ContractInstance> {
  const beaconAddress = getContractAddress(beacon);
  const { impl: nextImpl } = await deployBeaconImpl(Contract, opts, beaconAddress);

  const UpgradeableBeaconFactory = getUpgradeableBeaconFactory(Contract);
  const beaconContract = new UpgradeableBeaconFactory(beaconAddress);
  const { tx: upgradeTx } = await beaconContract.upgradeTo(nextImpl);

  beaconContract.transactionHash = upgradeTx;
  return beaconContract;
}
