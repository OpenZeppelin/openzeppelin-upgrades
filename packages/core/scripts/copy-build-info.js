#!/usr/bin/env node

const fs = require('fs');
const assert = require('assert');

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

const buildInfoField = readJSON('artifacts/@openzeppelin/contracts/proxy/Proxy.sol/Proxy.dbg.json').buildInfo;
const jsonRelativePath = `artifacts/@openzeppelin/contracts/proxy/Proxy.sol/${buildInfoField}`;

const buildInfo = readJSON(jsonRelativePath);
const reducedInfo = { solcLongVersion: buildInfo.solcLongVersion, input: buildInfo.input };

const sources = reducedInfo.input.sources;
assert(sources.hasOwnProperty('@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol'));
assert(sources.hasOwnProperty('@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol'));
assert(sources.hasOwnProperty('@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol'));
assert(sources.hasOwnProperty('@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol'));
assert(sources.hasOwnProperty('@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol'));

writeJSON('artifacts/build-info.json', reducedInfo);
