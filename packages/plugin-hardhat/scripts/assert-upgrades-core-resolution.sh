#!/usr/bin/env bash

set -euo pipefail

# Purpose:
# - Assert that the upgrades-core CLI used through Foundry Upgrades' npx command
#   resolves to this repo's local workspace package, not an external/published one.
#
# Why this matters:
# - plugin-hardhat Solidity tests call into @openzeppelin/foundry-upgrades, which
#   invokes `npx @openzeppelin/upgrades-core@<version> validate`.
# - If npx resolves to a published package instead of local workspace code, CI may
#   pass while not actually testing unreleased local upgrades-core changes.
#
# What this script checks:
# 1) The UPGRADES_CORE version requested by Foundry Upgrades.
# 2) The workspace-resolved @openzeppelin/upgrades-core version/path.
# 3) The npx-resolved @openzeppelin/upgrades-core version/path for the requested version.
# 4) Assertion: npx path must equal workspace path.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$PKG_DIR/../.." && pwd)"

VERSIONS_SOL=""
if [[ -f "$ROOT_DIR/node_modules/@openzeppelin/foundry-upgrades/src/internal/Versions.sol" ]]; then
  VERSIONS_SOL="$ROOT_DIR/node_modules/@openzeppelin/foundry-upgrades/src/internal/Versions.sol"
elif [[ -f "$PKG_DIR/node_modules/@openzeppelin/foundry-upgrades/src/internal/Versions.sol" ]]; then
  VERSIONS_SOL="$PKG_DIR/node_modules/@openzeppelin/foundry-upgrades/src/internal/Versions.sol"
else
  echo "Could not find foundry-upgrades Versions.sol" >&2
  exit 1
fi

REQ_VERSION="$(
  node -e "const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');const m=s.match(/UPGRADES_CORE\\s*=\\s*\"([^\"]+)\"/);if(!m){throw new Error('UPGRADES_CORE not found');}console.log(m[1]);" "$VERSIONS_SOL"
)"

echo "Foundry requested upgrades-core version: $REQ_VERSION"
echo

(
  cd "$PKG_DIR"
  node -e "console.log('Workspace upgrades-core:');console.log('  version:', require('@openzeppelin/upgrades-core/package.json').version);console.log('  path:   ', require.resolve('@openzeppelin/upgrades-core/package.json'));"
)

echo

(
  cd "$PKG_DIR"
  NPX_RESOLUTION="$(
    npx --yes --package "@openzeppelin/upgrades-core@$REQ_VERSION" node -e "const pkg=require('@openzeppelin/upgrades-core/package.json');const p=require.resolve('@openzeppelin/upgrades-core/package.json');console.log(JSON.stringify({version:pkg.version,path:p}));"
  )"

  NPX_VERSION="$(node -e "const x=JSON.parse(process.argv[1]);console.log(x.version);" "$NPX_RESOLUTION")"
  NPX_PATH="$(node -e "const x=JSON.parse(process.argv[1]);console.log(x.path);" "$NPX_RESOLUTION")"
  WORKSPACE_PATH="$(node -e "console.log(require.resolve('@openzeppelin/upgrades-core/package.json'))")"

  echo "npx upgrades-core:"
  echo "  version: $NPX_VERSION"
  echo "  path:    $NPX_PATH"

  if [[ "$NPX_PATH" != "$WORKSPACE_PATH" ]]; then
    echo "Assertion failed: npx did not resolve to workspace @openzeppelin/upgrades-core." >&2
    echo "Expected: $WORKSPACE_PATH" >&2
    echo "Actual:   $NPX_PATH" >&2
    exit 1
  fi
)
