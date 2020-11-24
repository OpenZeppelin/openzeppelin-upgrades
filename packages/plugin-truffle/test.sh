#!/usr/bin/env bash

set -euo pipefail

rimraf test/.openzeppelin

yarn --cwd test truffle test "$@"
