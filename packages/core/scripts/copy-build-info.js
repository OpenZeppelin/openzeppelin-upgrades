#!/usr/bin/env node

const fs = require('fs');

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
writeJSON('artifacts/build-info.json', reducedInfo);
