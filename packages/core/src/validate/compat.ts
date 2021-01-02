// Legacy interface for backwards compatibility

import { ContractValidation, RunValidation } from './run';

export type ValidationLog = RunValidation[];
export type Validation = RunValidation;

export type ValidationResult = ContractValidation;
