#!/usr/bin/env bash

set -euo pipefail

for pkg in core plugin-buidler plugin-truffle; do
  yarn --cwd "packages/$pkg" test
done
