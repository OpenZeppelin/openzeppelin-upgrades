#!/bin/bash
set -euo pipefail

rimraf .openzeppelin
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

cp -r contracts contracts-backup
# Replace all pragma lines in .sol files with pragma solidity ^0.8.20;
find contracts -name "*.sol" -exec sh -c 'sed -E "s/pragma solidity (>=[0-9]+\.[0-7]\.[0-9]+<|[<>]=?|\^[0-9]+\.[0-7]\.[0-9]+).*;/pragma solidity ^0.8.20;/g" "$1" > "$1.tmp" && mv "$1.tmp" "$1"' _ {} \;
# Check if the system is macOS or Linux based and architecture
mkdir bin
# Download eth-rpc binary
curl -L https://github.com/paritytech/hardhat-polkadot/releases/download/nodes-19071579107/eth-rpc-${system}-${arch} -o bin/eth-rpc
chmod +x bin/eth-rpc
if [[ "$system" == "darwin" ]]; then
    xattr -c bin/eth-rpc
fi
# Download revive-dev-node binary
curl -L https://github.com/paritytech/hardhat-polkadot/releases/download/nodes-19071579107/revive-dev-node-${system}-${arch} -o bin/dev-node
chmod +x bin/dev-node
if [[ "$system" == "darwin" ]]; then
    xattr -c bin/dev-node
fi
hardhat compile --config hardhat.revive.config.js
hardhat test --config hardhat.revive.config.js test-pvm/*
rm -rf contracts
rm -rf bin
mv contracts-backup contracts