#!/usr/bin/env bash

set -xeuo pipefail

yarn lerna run clean

yarn prepare

mv packages/core/node_modules core-node_modules

t=hardhat

mkdir -p "packages/plugin-$t/node_modules/@openzeppelin"
if [ ! -e "packages/plugin-$t/node_modules/@openzeppelin/upgrades-core" ]; then
  ln -sr packages/core "packages/plugin-$t/node_modules/@openzeppelin/upgrades-core"
fi
cd "packages/plugin-$t"
sed -i.bak -e 's/^}$/,"bundledDependencies":["@openzeppelin\/upgrades-core"]}/' package.json
npm pack --ignore-scripts
mv package.json.bak package.json
cd ../..

mv core-node_modules packages/core/node_modules

mv packages/plugin-*/*.tgz .
