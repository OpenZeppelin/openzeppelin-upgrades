#!/usr/bin/env bash

set -euo pipefail

rimraf .openzeppelin
hardhat compile
ava "$@"
