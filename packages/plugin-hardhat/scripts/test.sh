#!/usr/bin/env bash

set -euo pipefail

rimraf .openzeppelin
hardhat compile

# Separate .sol and .js test files
sol_tests=()
js_tests=()

for arg in "$@"; do
  if [[ "$arg" == *.sol ]]; then
    sol_tests+=("$arg")
  else
    js_tests+=("$arg")
  fi
done

# Run Solidity tests if any
if [ ${#sol_tests[@]} -gt 0 ]; then
  hardhat test solidity "${sol_tests[@]}"
fi

# Run JavaScript tests if any
if [ ${#js_tests[@]} -gt 0 ]; then
  ava "${js_tests[@]}"
fi

# If no arguments, run all tests
if [ $# -eq 0 ]; then
  ava
  hardhat test solidity
fi