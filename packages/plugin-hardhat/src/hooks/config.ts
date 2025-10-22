import type { ConfigHooks } from 'hardhat/types/hooks';

export default async (): Promise<Partial<ConfigHooks>> => {
  return {
    async resolveUserConfig(userConfig, resolveConfigurationVariable, next) {
      // First, let other plugins resolve the config
      const config = await next(userConfig, resolveConfigurationVariable);

      // Iterate through all profiles
      for (const profile of Object.values(config.solidity.profiles)) {
        // Accumulate references to all the compiler settings, including overrides
        const settings = [];

        for (const compiler of profile.compilers) {
          compiler.settings ??= {};
          settings.push(compiler.settings);
        }

        for (const compilerOverride of Object.values(profile.overrides)) {
          compilerOverride.settings ??= {};
          settings.push(compilerOverride.settings);
        }

        // Enable storage layout in all of them
        // TODO: Review this, not sure about the storage layout yet.
        for (const setting of settings) {
          setting.outputSelection ??= {};
          setting.outputSelection['*'] ??= {};
          setting.outputSelection['*']['*'] ??= [];

          if (!setting.outputSelection['*']['*'].includes('storageLayout')) {
            setting.outputSelection['*']['*'].push('storageLayout');
          }
        }
      }

      return config;
    },
  };
};
