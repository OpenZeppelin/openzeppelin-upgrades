import { ValidationRunData } from './run';

type ValidationDataV1 = ValidationRunData;

type ValidationDataV2 = ValidationRunData[];

interface ValidationDataV3 {
  version: '3';
  log: ValidationRunData[];
}

export type ValidationDataCurrent = ValidationDataV3;

export type ValidationData = ValidationDataV1 | ValidationDataV2 | ValidationDataV3;

export function normalizeValidationData(data: ValidationData): ValidationDataCurrent {
  if (Array.isArray(data)) {
    return { version: '3', log: data };
  } else if (!('version' in data)) {
    return { version: '3', log: [data] };
  } else if (data.version === '3') {
    return data as ValidationDataV3;
  } else {
    throw new Error('Unknown version or malformed validation data');
  }
}

export function concatRunData(data: ValidationData, newRunData: ValidationRunData): ValidationDataCurrent {
  return {
    version: '3',
    log: [newRunData].concat(normalizeValidationData(data).log),
  };
}
