/* eslint-disable @typescript-eslint/no-var-requires */

import '@nomiclabs/hardhat-ethers';
import { extendConfig, extendEnvironment } from 'hardhat/config';
import { lazyFunction, lazyObject } from 'hardhat/plugins';
import { HardhatConfig, HardhatUserConfig } from 'hardhat/types';
import type { ProposeUpgradeFunction } from './propose-upgrade';
import type {
  GetBytecodeDigestFunction,
  GetVerifyDeployArtifactFunction,
  GetVerifyDeployBuildInfoFunction,
  VerifyDeployFunction,
  VerifyDeployWithUploadedArtifactFunction,
} from './verify-deployment';
import './type-extensions';

export interface HardhatDefender {
  proposeUpgrade: ProposeUpgradeFunction;
  verifyDeployment: VerifyDeployFunction;
  verifyDeploymentWithUploadedArtifact: VerifyDeployWithUploadedArtifactFunction;
  getDeploymentArtifact: GetVerifyDeployArtifactFunction;
  getDeploymentBuildInfo: GetVerifyDeployBuildInfoFunction;
  getBytecodeDigest: GetBytecodeDigestFunction;
}

export interface HardhatDefenderConfig {
  apiKey: string;
  apiSecret: string;
}

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  if (!userConfig.defender || !userConfig.defender.apiKey || !userConfig.defender.apiSecret) {
    const sampleConfig = JSON.stringify({ apiKey: 'YOUR_API_KEY', apiSecret: 'YOUR_API_SECRET' }, null, 2);
    console.warn(
      `Defender API key and secret are not set. Add the following to your hardhat.config.js exported configuration:\n\n${sampleConfig}\n`,
    );
  }
  config.defender = userConfig.defender;
});

extendEnvironment(hre => {
  hre.defender = lazyObject((): HardhatDefender => {
    const {
      makeVerifyDeploy,
      makeVerifyDeployWithUploadedArtifact,
      makeGetVerifyDeployBuildInfo,
      makeGetVerifyDeployArtifact,
      makeGetBytecodeDigest,
    } = require('./verify-deployment');
    return {
      // We wrap this one on a lazy function so we can delay the require of the upgrades plugin
      proposeUpgrade: lazyFunction(() => {
        const { makeProposeUpgrade } = require('./propose-upgrade');
        return makeProposeUpgrade(hre);
      }),
      verifyDeployment: makeVerifyDeploy(hre),
      verifyDeploymentWithUploadedArtifact: makeVerifyDeployWithUploadedArtifact(hre),
      getDeploymentArtifact: makeGetVerifyDeployArtifact(hre),
      getDeploymentBuildInfo: makeGetVerifyDeployBuildInfo(hre),
      getBytecodeDigest: makeGetBytecodeDigest(hre),
    };
  });
});
