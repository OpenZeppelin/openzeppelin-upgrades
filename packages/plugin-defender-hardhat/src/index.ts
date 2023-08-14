/* eslint-disable @typescript-eslint/no-var-requires */

import '@nomicfoundation/hardhat-ethers';
import { extendEnvironment } from 'hardhat/config';
import { lazyFunction, lazyObject } from 'hardhat/plugins';
import type { ProposeUpgradeFunction } from './propose-upgrade';
import './type-extensions';
import type {
  GetBytecodeDigestFunction,
  GetVerifyDeployArtifactFunction,
  GetVerifyDeployBuildInfoFunction,
  VerifyDeployFunction,
  VerifyDeployWithUploadedArtifactFunction,
} from './verify-deployment';
import { DefenderHardhatUpgrades, makeDefenderFunctions } from '@openzeppelin/hardhat-upgrades';

export interface HardhatDefender extends DefenderHardhatUpgrades {
  proposeUpgrade: ProposeUpgradeFunction;
  verifyDeployment: VerifyDeployFunction;
  verifyDeploymentWithUploadedArtifact: VerifyDeployWithUploadedArtifactFunction;
  getDeploymentArtifact: GetVerifyDeployArtifactFunction;
  getDeploymentBuildInfo: GetVerifyDeployBuildInfoFunction;
  getBytecodeDigest: GetBytecodeDigestFunction;
}

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
      ...makeDefenderFunctions(hre),

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
