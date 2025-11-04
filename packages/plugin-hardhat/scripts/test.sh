#!/usr/bin/env bash

set -euo pipefail

rimraf .openzeppelin
hardhat compile

# Separate .sol and .js test files, and collect other arguments (flags)
sol_tests=()
js_tests=()
other_args=()

for arg in "$@"; do
  if [[ "$arg" == *.sol ]]; then
    sol_tests+=("$arg")
  elif [[ "$arg" == *.js ]] || [[ "$arg" == *.ts ]]; then
    js_tests+=("$arg")
  else
    # Collect flags and other arguments
    other_args+=("$arg")
  fi
done

# Run Solidity tests if any
if [ ${#sol_tests[@]} -gt 0 ]; then
  # Optional: explicitly set HARDHAT_ARTIFACTS=artifacts if you want to be explicit
  # Otherwise, auto-detection will handle it
  hardhat test solidity "${sol_tests[@]}" "${other_args[@]}"
fi

# Run JavaScript tests if any
if [ ${#js_tests[@]} -gt 0 ]; then
  ava "${js_tests[@]}" "${other_args[@]}"
fi

# If no arguments, run all tests
if [ $# -eq 0 ]; then
  ava
  hardhat test solidity
fi