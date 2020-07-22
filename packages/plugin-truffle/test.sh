#!/usr/bin/env bash

rimraf test/.openzeppelin

yarn --cwd test truffle test
