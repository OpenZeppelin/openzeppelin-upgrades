#!/usr/bin/env bash

set -euo pipefail

rimraf .openzeppelin
npx hardhat compile
ava "$@"
