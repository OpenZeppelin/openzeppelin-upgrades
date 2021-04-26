#!/usr/bin/env bash

set -euo pipefail

# Copies proxy artifacts to their location in previous versions for backwards compatibility

mkdir artifacts/contracts/proxy/{,AdminUpgradeabilityProxy.sol,ProxyAdmin.sol}

cp artifacts/contracts/import.sol/AdminUpgradeabilityProxy.json artifacts
cp artifacts/contracts/import.sol/AdminUpgradeabilityProxy.json artifacts/contracts/proxy/AdminUpgradeabilityProxy.sol

cp artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json artifacts
cp artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json artifacts/contracts/proxy/ProxyAdmin.sol
