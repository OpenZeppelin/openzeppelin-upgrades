#!/usr/bin/env bash

set -euo pipefail

rimraf .openzeppelin
buidler compile
ava "$@"
