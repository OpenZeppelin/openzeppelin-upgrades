#!/bin/bash
set -euo pipefail

rimraf .openzeppelin
# Replace all pragma lines in .sol files with pragma solidity ^0.8.20;
find contracts -name "*.sol" -exec sed -i '' 's/^pragma solidity ^0\.[^8].*/pragma solidity ^0.8.20;/' {} \;
# Check if the system is macOS or Linux based and architecture
os=$(uname -s)
if [[ "$os" == "Linux" ]]; then
    system="linux"
elif [[ "$os" == "Darwin" ]]; then
    system="darwin"
fi

arch=$(uname -m)
if [[ "$arch" == "x86_64" ]]; then
    arch="x64"
elif [[ "$arch" == "aarch64" ]] || [[ "$arch" == "arm64" ]]; then
    arch="arm64"
fi
mkdir bin
# Download eth-rpc binary
curl -L https://github.com/paritytech/hardhat-polkadot/releases/download/nodes-17973191726/eth-rpc-${system}-${arch} -o bin/eth-rpc
chmod +x bin/eth-rpc
if [[ "$system" == "darwin" ]]; then
    xattr -c bin/eth-rpc
fi
# Download revive-dev-node binary
curl -L https://github.com/paritytech/hardhat-polkadot/releases/download/nodes-17973191726/revive-dev-node-${system}-${arch} -o bin/dev-node
chmod +x bin/dev-node
if [[ "$system" == "darwin" ]]; then
    xattr -c bin/dev-node
fi
hardhat compile --config hardhat.revive.config.js
hardhat test --config hardhat.revive.config.js test/polkavm/*