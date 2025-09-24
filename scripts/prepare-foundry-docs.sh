#!/usr/bin/env bash
git submodule update --init --recursive
rm -rf docs/modules/ROOT/pages/foundry
cp -r submodules/openzeppelin-foundry-upgrades/docs/modules docs/modules/ROOT/pages/foundry