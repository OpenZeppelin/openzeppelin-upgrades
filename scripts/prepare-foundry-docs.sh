#!/usr/bin/env bash

git clone -b docgen https://github.com/ericglau/openzeppelin-foundry-upgrades
cp -r openzeppelin-foundry-upgrades/docs/modules docs/modules/ROOT/pages/foundry
