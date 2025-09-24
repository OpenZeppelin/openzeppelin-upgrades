#!/usr/bin/env bash
git submodule add https://github.com/OpenZeppelin/openzeppelin-foundry-upgrades submodules/openzeppelin-foundry-upgrades
rm -rf docs/modules/ROOT/pages/foundry
cp -r submodules/openzeppelin-foundry-upgrades/docs/modules docs/modules/ROOT/pages/foundry