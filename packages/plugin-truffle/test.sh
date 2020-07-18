#!/usr/bin/env bash

# We need a full compilation to ensure all build artifacts are in
# build/contracts and that the AST ids are consistent
yarn --cwd test truffle compile --all

yarn --cwd test truffle test
