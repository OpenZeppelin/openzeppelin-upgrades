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
  if (isCurrentValidationData(data)) {
    return data;
  } else if (Array.isArray(data)) {
    return { version: '3', log: data };
  } else {
    return { version: '3', log: [data] };
  }
}

export function isCurrentValidationData(data: ValidationData): data is ValidationDataCurrent {
  if (Array.isArray(data)) {
    return false;
  } else if (!('version' in data)) {
    return false;
  } else if (data.version === '3') {
    return true;
  } else {
    throw new Error('Unknown version or malformed validation data');
  }
}

export function concatRunData(
  newRunData: ValidationRunData,
  previousData?: ValidationDataCurrent,
): ValidationDataCurrent {
  return {
    version: '3',
    log: [newRunData].concat(previousData?.log ?? []),
  };
}
