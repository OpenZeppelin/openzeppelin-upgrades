#!/usr/bin/env bash

rm -rf docs/modules/ROOT/pages/foundry
cp -r submodules/openzeppelin-foundry-upgrades/docs/modules docs/modules/ROOT/pages/foundry
# Checks if Foundry docs are up to date. If this fails, commit the changes from the above commands.
git diff --exit-code docs/modules/ROOT/pages/foundry