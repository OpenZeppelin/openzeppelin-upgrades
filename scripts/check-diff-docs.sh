#!/usr/bin/env bash

# Checks if Foundry docs are up to date. If this fails, commit the changes from the above commands.
git diff --exit-code docs/modules/ROOT/pages/foundry