import { keccak256 } from 'ethereumjs-util';

import { Version } from '../version';
import { ValidationError, ValidationRunData } from './run';
import { ValidationData } from './data';
import { ValidationOptions, processExceptions } from './overrides';
import { ValidationErrors } from './error';
import { UpgradesError } from '../error';
import { getContractNameAndRunValidation } from './query';

interface SelectorClash {
  selector: string;
  original: string;
  updated: string;
}

function getSelector(signature: string): string {
  return keccak256(Buffer.from(signature)).toString('hex', 0, 4);
}

function getMethodSelectors(runData: ValidationRunData, fullContractName: string): Record<string, string> | undefined {
  const selectors: Record<string, string> = {};
  for (const name of [fullContractName, ...runData[fullContractName].inherit]) {
    const { abiMethods } = runData[name];
    if (abiMethods === undefined) {
      return undefined;
    }
    for (const signature of abiMethods) {
      selectors[signature] = getSelector(signature);
    }
  }
  return selectors;
}

function findSelectorClashes(original: Record<string, string>, updated: Record<string, string>): SelectorClash[] {
  const originalBySelector = new Map(Object.entries(original).map(([signature, selector]) => [selector, signature]));

  return Object.entries(updated).flatMap(([signature, selector]) => {
    const originalSignature = originalBySelector.get(selector);
    return originalSignature !== undefined && originalSignature !== signature
      ? [{ selector: '0x' + selector, original: originalSignature, updated: signature }]
      : [];
  });
}

export function getSelectorClashErrors(
  originalRun: ValidationRunData,
  originalName: string,
  updatedRun: ValidationRunData,
  updatedName: string,
  opts: ValidationOptions = {},
): ValidationError[] {
  const original = getMethodSelectors(originalRun, originalName);
  const updated = getMethodSelectors(updatedRun, updatedName);

  if (original === undefined || updated === undefined) {
    if (opts.unsafeAllow?.includes('selector-clash')) {
      return [];
    }
    throw new UpgradesError(
      `Could not determine function selectors for contract \`${original === undefined ? originalName : updatedName}\``,
      () =>
        `Recompile your contracts and run the validation again. To skip this check, use the \`unsafeAllow.selector-clash\` flag.`,
    );
  }

  const errors: ValidationError[] = findSelectorClashes(original, updated).map(clash => ({
    kind: 'selector-clash',
    src: updatedRun[updatedName].src,
    ...clash,
  }));

  return processExceptions(updatedName, errors, opts);
}

export function assertSelectorClashFree(
  originalData: ValidationData,
  originalVersion: Version,
  updatedData: ValidationData,
  updatedVersion: Version,
  opts: ValidationOptions = {},
): void {
  const [originalName, originalRun] = getContractNameAndRunValidation(originalData, originalVersion);
  const [updatedName, updatedRun] = getContractNameAndRunValidation(updatedData, updatedVersion);

  const errors = getSelectorClashErrors(originalRun, originalName, updatedRun, updatedName, opts);
  if (errors.length > 0) {
    throw new ValidationErrors(updatedName, errors);
  }
}
