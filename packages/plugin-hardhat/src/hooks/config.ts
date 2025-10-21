import type { ConfigHooks } from 'hardhat/types/hooks';

export default async (): Promise<Partial<ConfigHooks>> => {
  return {
    afterResolveConfig(context) {
      const { config } = context;
      
      // Accumulate references to all the compiler settings, including overrides
      const settings = [];
      for (const compiler of config.solidity.compilers) {
        compiler.settings ??= {};
        settings.push(compiler.settings);
      }
      for (const compilerOverride of Object.values(config.solidity.overrides)) {
        compilerOverride.settings ??= {};
        settings.push(compilerOverride.settings);
      }

      // Enable storage layout in all of them
      for (const setting of settings) {
        setting.outputSelection ??= {};
        setting.outputSelection['*'] ??= {};
        setting.outputSelection['*']['*'] ??= [];

        if (!setting.outputSelection['*']['*'].includes('storageLayout')) {
          setting.outputSelection['*']['*'].push('storageLayout');
        }
      }
    },
  };
};
