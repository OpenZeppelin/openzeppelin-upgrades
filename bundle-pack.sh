#!/usr/bin/env bash

set -xeuo pipefail

yarn lerna run prepublish

yarn prepare

mv packages/core/node_modules core-node_modules

for t in hardhat truffle; do
  mkdir -p "packages/plugin-$t/node_modules/@openzeppelin"
  ln -srf packages/core "packages/plugin-$t/node_modules/@openzeppelin/upgrades-core"
  cd "packages/plugin-$t"
  sed -i.bak -e 's/^}$/,"bundledDependencies":["@openzeppelin\/upgrades-core"]}/' package.json
  npm pack --ignore-scripts
  mv package.json.bak package.json
  cd ../..
done

mv core-node_modules packages/core/node_modules

mv packages/plugin-*/*.tgz .
