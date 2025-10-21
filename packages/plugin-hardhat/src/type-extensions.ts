import 'hardhat/types/config';

export type NamespacedCompileErrorsRule = 'error' | 'warn' | 'ignore';

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    namespacedCompileErrors?: NamespacedCompileErrorsRule;
  }

  export interface HardhatConfig {
    namespacedCompileErrors?: NamespacedCompileErrorsRule;
  }
}
