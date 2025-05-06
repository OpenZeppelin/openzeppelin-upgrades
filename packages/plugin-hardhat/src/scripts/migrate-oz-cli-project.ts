#!/usr/bin/env node
import { migrateLegacyProject } from '@ericglau/upgrades-core';

migrateLegacyProject().catch(e => {
  console.error(e);
  process.exit(1);
});
