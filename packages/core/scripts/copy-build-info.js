#!/usr/bin/env node

const fs = require('fs');
const assert = require('assert');

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function hasProperty(obj, prop) {
  return prop in obj;
}

const buildInfoField = readJSON(
  'artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.dbg.json',
).buildInfo;
const jsonRelativePath = `artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/${buildInfoField}`;

const buildInfo = readJSON(jsonRelativePath);
const reducedInfo = { solcLongVersion: buildInfo.solcLongVersion, input: buildInfo.input };

const sources = reducedInfo.input.sources;
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol'));

writeJSON('artifacts/build-info.json', reducedInfo);
