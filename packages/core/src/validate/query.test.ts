import test from 'ava';

import { ContractValidation, ValidationRunData } from './run';
import { getUnlinkedBytecode } from './query';
import { getVersion } from '../version';

test('getUnlinkedBytecode skips invalid unrelated link references', t => {
  const bytecode = '0x6000';
  const validation: Record<string, Partial<ContractValidation>> = {
    Unrelated: {
      version: getVersion(bytecode),
      linkReferences: [
        {
          src: '',
          name: 'Library',
          start: 0,
          length: 1,
          placeholder: '__$not-a-valid-placeholder$__',
        },
      ],
    },
  };

  t.is(getUnlinkedBytecode(validation as ValidationRunData, bytecode), bytecode);
});
test('getUnlinkedBytecode', t => {
  const unlinkedBytecode = '0x12__$5ae0c2211b657f8a7ca51e0b14f2a8333d$__78';
  const linkedBytecode = '0x12456456456456456456456456456456456456456478';

  const validation: Record<string, Partial<ContractValidation>> = {
    B: {
      version: getVersion(unlinkedBytecode),
      linkReferences: [
        {
          src: '',
          name: '',
          start: 50,
          length: 20,
          placeholder: '__$5ae0c2211b657f8a7ca51e0b14f2a8333d$__',
        },
        {
          src: '',
          name: '',
          start: 30,
          length: 20,
          placeholder: '__$5ae0c2211b657f8a7ca51e0b14f2a8333d$__',
        },
      ],
    },
    A: {
      version: getVersion(unlinkedBytecode),
      linkReferences: [
        {
          src: '',
          name: '',
          start: 1,
          length: 20,
          placeholder: '__$5ae0c2211b657f8a7ca51e0b14f2a8333d$__',
        },
      ],
    },
  };

  const recovered = getUnlinkedBytecode(validation as ValidationRunData, linkedBytecode);

  t.is(recovered, unlinkedBytecode);
});
