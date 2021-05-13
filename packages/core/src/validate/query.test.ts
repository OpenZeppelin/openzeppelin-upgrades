import test from 'ava';

import { ContractValidation, ValidationRunData } from './run';
import { getUnlinkedBytecode } from './query';
import { getVersion } from '../version';

test('getUnlinkedBytecode', t => {
  const unlinkedBytecode = '0x12$__$78';
  const linkedBytecode = '0x12345678';

  const validation: Record<string, Partial<ContractValidation>> = {
    A: {
      version: getVersion(unlinkedBytecode),
      linkReferences: [
        {
          src: '',
          name: '',
          start: 1,
          length: 2,
          placeholder: '$__$',
        },
      ],
    },
  };

  const recovered = getUnlinkedBytecode(validation as ValidationRunData, linkedBytecode);

  t.is(recovered, unlinkedBytecode);
});
