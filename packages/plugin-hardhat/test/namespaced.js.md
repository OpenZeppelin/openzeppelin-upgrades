# Snapshot report for `test/namespaced.js`

The actual snapshot is saved in `namespaced.js.snap`.

Generated by [AVA](https://avajs.dev).

## validate namespace - bad

> Snapshot 1

    `New storage layout is incompatible␊
    ␊
    Example: Deleted \`x\`␊
      > Keep the variable even if unused`

## validate namespace - recursive - bad

> Snapshot 1

    `New storage layout is incompatible␊
    ␊
    contracts/Namespaced.sol:109: Upgraded \`s\` to an incompatible type␊
      - Bad upgrade from struct RecursiveStruct.MyStruct to struct RecursiveStructV2_Bad.MyStruct␊
      - In struct RecursiveStructV2_Bad.MyStruct␊
        - Added \`c\``

## validate namespace - triple struct - bad

> Snapshot 1

    `New storage layout is incompatible␊
    ␊
    contracts/Namespaced.sol:162: Upgraded \`s\` to an incompatible type␊
      - Bad upgrade from struct TripleStruct.Outer to struct TripleStructV2_Bad.Outer␊
      - In struct TripleStructV2_Bad.Outer␊
        - Upgraded \`i\` to an incompatible type␊
          - Bad upgrade from struct TripleStruct.Inner to struct TripleStructV2_Bad.Inner␊
      - In struct TripleStructV2_Bad.Inner␊
        - Added \`c\``

## multiple namespaces and regular variables - bad

> Snapshot 1

    `New storage layout is incompatible␊
    ␊
    contracts/Namespaced.sol:225: Inserted \`a2\`␊
      > New variables should be placed after all existing inherited variables␊
    ␊
    contracts/Namespaced.sol:211: Inserted \`a2\`␊
      > New variables should be placed after all existing inherited variables␊
    ␊
    contracts/Namespaced.sol:219: Inserted \`a2\`␊
      > New variables should be placed after all existing inherited variables`

## delete namespace - bad

> Snapshot 1

    `New storage layout is incompatible␊
    ␊
    Example: Deleted namespace \`erc7201:example.main\`␊
      > Keep the struct with annotation '@custom:storage-location erc7201:example.main' even if unused`

## moving namespace to inherited contract - delete variable - bad

> Snapshot 1

    `New storage layout is incompatible␊
    ␊
    Example: Deleted \`x\`␊
      > Keep the variable even if unused`

## moving namespace to inherited contract - delete variable and has layout - bad

> Snapshot 1

    `New storage layout is incompatible␊
    ␊
    Example: Deleted \`x\`␊
      > Keep the variable even if unused`
