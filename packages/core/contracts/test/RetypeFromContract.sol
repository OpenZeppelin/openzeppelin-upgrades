// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface CustomInterface {}
contract CustomContract {}

interface CustomInterface2 {}
contract CustomContract2 {}

contract RetypeContractToUintV1 {
    CustomInterface a;
    CustomContract b;
}

contract RetypeContractToUintV2 {
    /// @custom:oz-retyped-from CustomInterface
    uint160 a;

    /// @custom:oz-retyped-from CustomContract
    uint160 b;
}

contract RetypeUintToContractV1 {
    uint160 a;
    uint160 b;
}

contract RetypeUintToContractV2 {
    /// @custom:oz-retyped-from uint160
    CustomInterface private a;

    /// @custom:oz-retyped-from uint160
    CustomContract private b;
}

contract RetypeContractToUintMappingV1 {
    mapping(uint8 => CustomInterface) a;
    mapping(uint8 => CustomContract) b;
    mapping(CustomInterface => CustomInterface) c;
    mapping(CustomContract => CustomContract) d;
}

contract RetypeContractToUintMappingV2 {
    /// @custom:oz-retyped-from mapping(uint8 => CustomInterface)
    mapping(uint8 => uint160) a;

    /// @custom:oz-retyped-from mapping(uint8 => CustomContract)
    mapping(uint8 => uint160) b;

    /// @custom:oz-retyped-from mapping(CustomInterface => CustomInterface)
    mapping(uint160 => uint160) c;

    /// @custom:oz-retyped-from mapping(CustomContract => CustomContract)
    mapping(uint160 => uint160) d;
}

contract RetypeUintToContractMappingV1 {
    mapping(uint8 => uint160) a;
    mapping(uint8 => uint160) b;
    mapping(uint8 => uint160) c;
    mapping(uint8 => uint160) d;
}

contract RetypeUintToContractMappingV2 {
    /// @custom:oz-retyped-from mapping(uint8 => uint160)
    mapping(uint8 => CustomInterface) a;

    /// @custom:oz-retyped-from mapping(uint8 => uint160)
    mapping(uint8 => CustomContract) b;

    /// @custom:oz-retyped-from mapping(uint160 => uint160)
    mapping(CustomInterface => CustomInterface) c;

    /// @custom:oz-retyped-from mapping(uint160 => uint160)
    mapping(CustomContract => CustomContract) d;
}

contract ImplicitRetypeV1 {
    CustomInterface a;
    CustomContract b;

    address c;
    address d;

    CustomInterface e;
    CustomInterface f;

    CustomContract g;
    CustomContract h;
}

contract ImplicitRetypeV2 {
    address a;
    address b;

    CustomInterface c;
    CustomContract d;

    CustomInterface2 e;
    CustomContract f;

    CustomContract2 g;
    CustomInterface h;
}

contract ImplicitRetypeMappingV1 {
    mapping(uint8 => CustomInterface) a;
    mapping(uint8 => CustomContract) b;

    mapping(uint8 => address) c;
    mapping(uint8 => address) d;

    mapping(uint8 => CustomInterface) e;
    mapping(uint8 => CustomInterface) f;

    mapping(uint8 => CustomContract) g;
    mapping(uint8 => CustomContract) h;
}

contract ImplicitRetypeMappingV2 {
    mapping(uint8 => address) a;
    mapping(uint8 => address) b;

    mapping(uint8 => CustomInterface) c;
    mapping(uint8 => CustomContract) d;

    mapping(uint8 => CustomInterface2) e;
    mapping(uint8 => CustomContract) f;

    mapping(uint8 => CustomContract2) g;
    mapping(uint8 => CustomInterface) h;
}
