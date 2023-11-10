#!/usr/bin/env bash

set -euo pipefail

# Copies proxy artifacts to their location in previous versions for backwards compatibility

mkdir -p artifacts

# Assert that a previous version of @openzeppelin/upgrades-core is installed, which contains legacy artifacts
if ! grep -q '"version": "1.31.1"' ../../node_modules/@openzeppelin/upgrades-core-legacy/package.json; then
  echo "Error: @openzeppelin/upgrades-core must depend on a previous version of itself at version 1.31.1"
  exit 1
fi

cp -R ../../node_modules/@openzeppelin/upgrades-core-legacy/artifacts .
