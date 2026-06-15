import 'hardhat/types/config';

// Client-neutral type extensions: the Hardhat configuration augmentations the plugin contributes,
// with no reference to ethers, viem, or their Hardhat plugins. This rides with the shared plugin
// module's declaration chain so that a viem-only project (without @nomicfoundation/hardhat-ethers)
// can type-check its Hardhat config.

export interface HardhatDefenderConfig {
  apiKey: string;
  apiSecret: string;
  useDefenderDeploy?: boolean;
  network?: string;
}

export type NamespacedCompileErrorsRule = 'error' | 'warn' | 'ignore';

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    defender?: HardhatDefenderConfig;
    namespacedCompileErrors?: NamespacedCompileErrorsRule;
  }

  export interface HardhatConfig {
    defender?: HardhatDefenderConfig;
    namespacedCompileErrors?: NamespacedCompileErrorsRule;
  }
}

export {};
