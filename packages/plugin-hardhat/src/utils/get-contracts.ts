import { Artifact, HardhatRuntimeEnvironment } from 'hardhat/types';
import { ReducedBuildInfo } from '../defender/deploy';

import artifactsBuildInfo from '@openzeppelin/upgrades-core/artifacts/build-info-v5.json';
import artifactsBuildInfoPVM from '@openzeppelin/upgrades-core/artifacts-pvm/build-info-v5.json';

import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';
import ERC1967ProxyPVM from '@openzeppelin/upgrades-core/artifacts-pvm/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';

import BeaconProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/BeaconProxy.sol/BeaconProxy.json';
import BeaconProxyPVM from '@openzeppelin/upgrades-core/artifacts-pvm/@openzeppelin/contracts-v5/proxy/beacon/BeaconProxy.sol/BeaconProxy.json';

import UpgradeableBeacon from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json';
import UpgradeableBeaconPVM from '@openzeppelin/upgrades-core/artifacts-pvm/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json';

import TransparentUpgradeableProxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';
import TransparentUpgradeableProxyPVM from '@openzeppelin/upgrades-core/artifacts-pvm/@openzeppelin/contracts-v5/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';

import ProxyAdminV5 from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';
import ProxyAdminV5PVM from '@openzeppelin/upgrades-core/artifacts-pvm/@openzeppelin/contracts-v5/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';

export interface UpgradeContracts {
  buildInfo: ReducedBuildInfo;
  erc1967: Artifact;
  beaconProxy: Artifact;
  upgradeableBeacon: Artifact;
  transparentUpgradeableProxy: Artifact;
  proxyAdminV5: Artifact;
}

export function getContracts(hre: HardhatRuntimeEnvironment): UpgradeContracts {
  const notPVM = !('polkadot' in hre.network && hre.network.polkadot instanceof Object && 'target' in hre.network.polkadot && hre.network.polkadot.target === 'pvm');
  return {
    buildInfo: notPVM ? artifactsBuildInfo : artifactsBuildInfoPVM,
    erc1967: notPVM ? ERC1967Proxy : ERC1967ProxyPVM,
    beaconProxy: notPVM ? BeaconProxy : BeaconProxyPVM,
    transparentUpgradeableProxy: notPVM ? TransparentUpgradeableProxy : TransparentUpgradeableProxyPVM,
    upgradeableBeacon: notPVM ? UpgradeableBeacon : UpgradeableBeaconPVM,
    proxyAdminV5: notPVM ? ProxyAdminV5 : ProxyAdminV5PVM,
  };
}
