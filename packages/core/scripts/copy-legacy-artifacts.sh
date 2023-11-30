#!/usr/bin/env bash

set -euo pipefail

# Copies proxy artifacts to their location in previous versions for backwards compatibility

mkdir -p artifacts

# Assert that a previous version of @openzeppelin/upgrades-core is installed, which contains legacy artifacts.
if ! jq -r .version ../../node_modules/@openzeppelin/upgrades-core-legacy/package.json | grep -q '^1.31.3$'; then
  echo "Error: @openzeppelin/upgrades-core must depend on a previous version of itself at version 1.31.3"
  exit 1
fi

# Assert that each of the legacy artifacts exists in the previous version
for file in \
  artifacts/AdminUpgradeabilityProxy.json \
  artifacts/ProxyAdmin.json \
  artifacts/contracts/proxy/AdminUpgradeabilityProxy.sol/AdminUpgradeabilityProxy.json \
  artifacts/contracts/proxy/ProxyAdmin.sol/ProxyAdmin.json \
  artifacts/@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol/BeaconProxy.json \
  artifacts/@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json \
  artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json \
  artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json \
  artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json \
  artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/ITransparentUpgradeableProxy.json \
  artifacts/build-info.json
do
  if [ ! -f "../../node_modules/@openzeppelin/upgrades-core-legacy/$file" ]; then
    echo "Error: @openzeppelin/upgrades-core must depend on a previous version of itself which contains $file"
    exit 1
  fi
done

cp -R ../../node_modules/@openzeppelin/upgrades-core-legacy/artifacts .
