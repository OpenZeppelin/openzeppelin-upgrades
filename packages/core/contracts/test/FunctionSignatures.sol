// SPDX-License-Identifier: MIT
pragma solidity ^0.6.8;

pragma experimental ABIEncoderV2;

contract ContractFunctionSignatures {
    function f01() public {}
    function f02(uint x) public {}
    function f03(string calldata a) public {}
    function f04(string calldata a, string calldata b) public {}
    function f05(uint[] calldata xs) public {}
    function f06(uint[5] calldata xs) public {}

    enum Enum {
        A,
        B,
        C
    }

    function f07(Enum e) public {}

    struct S1 {
        uint m1;
        uint m2;
    }

    function f08(S1 calldata) public {}

    struct S2 {
        string m1;
        uint8 m2;
        S1 m3;
    }

    function f09(S2 calldata) public {}

    function f10(bytes calldata) public {}

    function f11(bytes32) public {}

    function f12(ContractFunctionSignatures) public {}

    function f13(function(address,uint256,bytes32) external) public {}

    function f14(function(address,uint256,bytes32) external returns (bool)) public {}

    function f15(function(Enum,S1 memory) external returns (bool)) public {}

    function f16(function(Enum,S1 memory) external returns (bool),Enum,S1 memory) public {}
}

library LibraryFunctionSignatures {
    struct S {
        address a;
    }

    function lf01(S storage s) external {}

    function lf02(mapping (uint => uint) storage m) external {}

    function lf03(uint[] storage s) external {}
}
