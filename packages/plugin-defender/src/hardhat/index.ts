/* eslint-disable @typescript-eslint/no-var-requires */

import '@nomiclabs/hardhat-ethers';
import { extendConfig, extendEnvironment } from 'hardhat/config';
import { lazyObject } from 'hardhat/plugins';
import { HardhatConfig, HardhatUserConfig } from 'hardhat/types';
import { ProposeUpgradeFunction } from './propose-upgrade';
import './type-extensions';

export interface HardhatDefenderUpgrades {
  proposeUpgrade: ProposeUpgradeFunction;
}

export interface HardhatDefenderConfig {
  apiKey: string;
  apiSecret: string;
}

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  if (!userConfig.defender) {
    console.warn(
      `Defender API key and secret are not set. Please add the following to your hardhat.config.js exported configuration:\n\n{\n  defender: {\n    apiKey: 'YOUR_API_KEY',\n    apiSecret: 'YOUR_API_SECRET'\n  }\n}\n`,
    );
  }
  config.defender = userConfig.defender;
});

extendEnvironment(hre => {
  hre.defender = lazyObject(
    (): HardhatDefenderUpgrades => {
      const { makeProposeUpgrade } = require('./propose-upgrade');
      return {
        proposeUpgrade: makeProposeUpgrade(hre),
      };
    },
  );
});
