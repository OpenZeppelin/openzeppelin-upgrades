# Snapshot report for `test/namespaced.js`

The actual snapshot is saved in `namespaced.js.snap`.

Generated by [AVA](https://avajs.dev).

## conflicting namespaces through inheritance

> Snapshot 1

    `Contract \`contracts/Namespaced.sol:ConflictingNamespace\` is not upgrade safe␊
    ␊
    contracts/Namespaced.sol:29: Namespace \`erc7201:example.main\` is defined multiple times␊
        Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts␊
    ␊
    contracts/Namespaced.sol:6: Namespace \`erc7201:example.main\` is defined multiple times␊
        Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts`

## duplicate namespaces in same contract

> Snapshot 1

    `Contract \`contracts/Namespaced.sol:DuplicateNamespace\` is not upgrade safe␊
    ␊
    contracts/Namespaced.sol:36: Namespace \`erc7201:conflicting\` is defined multiple times␊
        Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts␊
    ␊
    contracts/Namespaced.sol:41: Namespace \`erc7201:conflicting\` is defined multiple times␊
        Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts`

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
    contracts/Namespaced.sol:128: Upgraded \`s\` to an incompatible type␊
      - Bad upgrade from struct RecursiveStruct.MyStruct to struct RecursiveStructV2_Bad.MyStruct␊
      - In struct RecursiveStructV2_Bad.MyStruct␊
        - Added \`c\``

## validate namespace - triple struct - bad

> Snapshot 1

    `New storage layout is incompatible␊
    ␊
    contracts/Namespaced.sol:181: Upgraded \`s\` to an incompatible type␊
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
    contracts/Namespaced.sol:244: Inserted \`a2\`␊
      > New variables should be placed after all existing inherited variables␊
    ␊
    contracts/Namespaced.sol:230: Inserted \`a2\`␊
      > New variables should be placed after all existing inherited variables␊
    ␊
    contracts/Namespaced.sol:238: Inserted \`a2\`␊
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

## moving namespace to inherited contract - conflicting namespace - bad

> Snapshot 1

    `Contract \`contracts/Namespaced.sol:InheritsConflictingNamespace\` is not upgrade safe␊
    ␊
    contracts/Namespaced.sol:29: Namespace \`erc7201:example.main\` is defined multiple times␊
        Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts␊
    ␊
    contracts/Namespaced.sol:6: Namespace \`erc7201:example.main\` is defined multiple times␊
        Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts␊
    ␊
    contracts/Namespaced.sol:29: Namespace \`erc7201:example.main\` is defined multiple times␊
        Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts␊
    ␊
    contracts/Namespaced.sol:6: Namespace \`erc7201:example.main\` is defined multiple times␊
        Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts`

## moving namespace to inherited contract - conflicting namespace and has layout - bad

> Snapshot 1

    `Contract \`contracts/Namespaced.sol:InheritsConflictingNamespaceAndHasLayout\` is not upgrade safe␊
    ␊
    contracts/Namespaced.sol:29: Namespace \`erc7201:example.main\` is defined multiple times␊
        Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts␊
    ␊
    contracts/Namespaced.sol:6: Namespace \`erc7201:example.main\` is defined multiple times␊
        Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts␊
    ␊
    contracts/Namespaced.sol:29: Namespace \`erc7201:example.main\` is defined multiple times␊
        Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts␊
    ␊
    contracts/Namespaced.sol:6: Namespace \`erc7201:example.main\` is defined multiple times␊
        Use a unique namespace id for each struct annotated with '@custom:storage-location erc7201:<NAMESPACE_ID>' in your contract and its inherited contracts`