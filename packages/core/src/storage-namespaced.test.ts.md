# Snapshot report for `src/storage-namespaced.test.ts`

The actual snapshot is saved in `storage-namespaced.test.ts.snap`.

Generated by [AVA](https://avajs.dev).

## layout

> Snapshot 1

    {
      baseSlot: undefined,
      namespaces: [
        [
          'erc7201:example.main',
          [
            {
              contract: 'Example',
              label: 'x',
              src: 'file.sol:1',
              type: 't_uint256',
            },
            {
              contract: 'Example',
              label: 'y',
              src: 'file.sol:1',
              type: 't_uint256',
            },
          ],
        ],
      ],
      storage: [],
      types: [
        [
          't_uint256',
          {
            label: 'uint256',
            members: undefined,
          },
        ],
      ],
    }

## multiple namespaces

> Snapshot 1

    {
      baseSlot: undefined,
      namespaces: [
        [
          'erc7201:one',
          [
            {
              contract: 'MultipleNamespaces',
              label: 'a',
              src: 'file.sol:1',
              type: 't_uint256',
            },
          ],
        ],
        [
          'erc7201:two',
          [
            {
              contract: 'MultipleNamespaces',
              label: 'a',
              src: 'file.sol:1',
              type: 't_uint128',
            },
          ],
        ],
      ],
      storage: [],
      types: [
        [
          't_uint256',
          {
            label: 'uint256',
            members: undefined,
          },
        ],
        [
          't_uint128',
          {
            label: 'uint128',
            members: undefined,
          },
        ],
      ],
    }
