import test from 'ava';

import { ContractValidation, ValidationRunData } from './run';
import { getUnlinkedBytecode } from './query';
import { getVersion } from '../version';

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

test('getUnlinkedBytecode does not throw when build-info contains library-linked contracts', t => {
  // Regression test for https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/1227
  // When a build-info file contains contracts with external library link references,
  // getUnlinkedBytecode should not throw "Bytecode is not a valid hex string" for
  // unrelated contracts that have no library dependencies.

  // Target contract: simple bytecode with no library dependencies
  const targetBytecode = '0x' + 'ab'.repeat(50); // 100 hex chars, valid hex

  // A different contract has link references at offsets that fall within targetBytecode bounds
  // Applying wrong link references corrupts the bytecode (produces non-hex strings)
  const validation: Record<string, Partial<ContractValidation>> = {
    LibraryLinkedContract: {
      version: undefined, // different version, won't match
      linkReferences: [
        {
          src: '',
          name: '',
          start: 1,  // within bounds of targetBytecode
          length: 20,
          placeholder: '__$5ae0c2211b657f8a7ca51e0b14f2a8333d$__',
        },
      ],
    },
    SimpleContract: {
      version: getVersion(targetBytecode),
      linkReferences: [], // no library dependencies
    },
  };

  // Should not throw, should return targetBytecode unchanged since SimpleContract has no linkReferences
  t.notThrows(() => {
    const result = getUnlinkedBytecode(validation as ValidationRunData, targetBytecode);
    t.is(result, targetBytecode);
  });
});
