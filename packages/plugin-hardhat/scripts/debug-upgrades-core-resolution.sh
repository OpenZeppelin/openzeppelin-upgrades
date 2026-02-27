#!/usr/bin/env bash

set -euo pipefail

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
  set +e
  npx --yes --package "@openzeppelin/upgrades-core@$REQ_VERSION" node -e "console.log('npx upgrades-core:');console.log('  version:', require('@openzeppelin/upgrades-core/package.json').version);console.log('  path:   ', require.resolve('@openzeppelin/upgrades-core/package.json'));"
  status=$?
  set -e
  if [[ $status -ne 0 ]]; then
    echo "npx resolution failed (likely offline or registry unavailable)." >&2
    echo "Tried: @openzeppelin/upgrades-core@$REQ_VERSION" >&2
  fi
)
