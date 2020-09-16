#!/usr/bin/env node

const { version } = require(process.cwd() + '/package.json');
const [date] = new Date().toISOString().split('T');

const fs = require('fs');
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

const unreleased = /^## Unreleased$/im;

if (!unreleased.test(changelog)) {
  console.error('Missing changelog entry');
  process.exit(1);
}

fs.writeFileSync('CHANGELOG.md', changelog.replace(unreleased, `## ${version} (${date})`));

const proc = require('child_process');
proc.execSync('git add CHANGELOG.md', { stdio: 'inherit' });
