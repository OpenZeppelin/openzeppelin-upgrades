#!/usr/bin/env bash

set -euo pipefail

# Guard: the optional viem integration must stay isolated under dist/viem so that the
# main entry point never references @nomicfoundation/hardhat-viem or viem, which are
# optional peer dependencies that ethers-only users do not install.
if grep -rl --include='*.js' --include='*.d.ts' -e '@nomicfoundation/hardhat-viem' -e 'from .viem.' -e 'import(.viem.)' dist | grep -v '^dist/viem/'; then
  echo "Error: files outside dist/viem reference the optional viem integration (see above)." >&2
  exit 1
fi

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

# Error if flags were provided but no test files
if [ $# -gt 0 ] && [ ${#sol_tests[@]} -eq 0 ] && [ ${#js_tests[@]} -eq 0 ]; then
  echo "Error: Flags provided but no test files specified." >&2
  echo "Usage: $0 [test files...] [flags...]" >&2
  echo "  Example: $0 test/beacon-happy-path.js --timeout=60s" >&2
  exit 1
fi

# Run Solidity tests if any
if [ ${#sol_tests[@]} -gt 0 ]; then
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