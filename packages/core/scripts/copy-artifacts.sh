#!/usr/bin/env bash

set -euo pipefail

# copies proxy artifacts to the location they were until 1.3.0 for backwards compatibility with truffle plugin

cp artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.json artifacts
cp artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json artifacts
cp artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json artifacts
