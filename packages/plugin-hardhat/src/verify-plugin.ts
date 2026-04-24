import { overrideTask } from 'hardhat/config';
import type { HardhatPlugin } from 'hardhat/types/plugins';

const plugin: HardhatPlugin = {
  id: '@openzeppelin/hardhat-upgrades/verify',

  dependencies: () => [import('@nomicfoundation/hardhat-verify').then(m => ({ default: m.default }))],

  tasks: [
    overrideTask('verify')
      .setAction(async () => import('./verify-proxy-task-action.js'))
      .build(),
  ],
};

export default plugin;
