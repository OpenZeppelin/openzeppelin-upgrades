#!/usr/bin/env bash

set -euo pipefail

yarn install --frozen-lockfile
changeset publish
git push --follow-tags
