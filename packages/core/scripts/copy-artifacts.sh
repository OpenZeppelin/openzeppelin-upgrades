#!/usr/bin/env bash

set -euo pipefail

# copies proxy artifacts to the location they were until 1.3.0 for backwards compatibility with truffle plugin

cp artifacts/contracts/proxy/{AdminUpgradeabilityProxy.sol/AdminUpgradeabilityProxy.json,ProxyAdmin.sol/ProxyAdmin.json} artifacts
