#!/usr/bin/env bash

set -euo pipefail

changeset version

node scripts/release/format-changelog.js
