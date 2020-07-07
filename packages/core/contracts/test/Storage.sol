// SPDX-License-Identifier: MIT
pragma solidity ^0.6.8;

contract Storage1 {
  uint u1 = 0;
  uint constant u2 = 0;
  uint immutable u3 = 0;

  address a1 = address(0);
  address constant a2 = address(0);
  address immutable a3 = address(0);

  mapping (uint => uint) m1;

  uint[3] us1;
}

// merged from all storage mocks in OpenZeppelin SDK test suite
contract Storage2 {
  uint256 public my_public_uint256;
  string internal my_internal_string;
  uint8 private my_private_uint8;
  int8 private my_private_uint16;
  bool private my_private_bool;
  uint private my_private_uint;
  address private my_private_address;

  bytes internal my_bytes;
  bytes8 internal my_bytes8;
  bytes32 internal my_bytes32;

  uint256[] public my_public_uint256_dynarray;
  string[] internal my_internal_string_dynarray;
  address[] private my_private_address_dynarray;
  int8[10] public my_public_int8_staticarray;
  bool[20] internal my_internal_bool_staticarray;
  uint[30] private my_private_uint_staticarray;

  mapping(uint256 => string) public my_mapping;
  mapping(uint256 => mapping(string => address)) internal my_nested_mapping;
  mapping(uint256 => bool[]) private my_mapping_with_arrays;

  function(uint) internal my_fun;
  function(string memory, string memory)[] internal my_fun_dynarray;
  function(uint) returns (address)[10] internal my_fun_staticarray;
  mapping(uint256 => function(bool)) internal my_fun_mapping;

  Storage2 public my_contract;
  Storage2[] private my_contract_dynarray;
  Storage2[10] internal my_contract_staticarray;
  mapping(uint256 => Storage2) private my_contract_mapping;
  mapping(uint256 => Storage2[]) private my_contract_dynarray_mapping;
  mapping(uint256 => Storage2[10]) private my_contract_staticarray_mapping;

  struct MyStruct {
    uint256 struct_uint256;
    string struct_string;
    address struct_address;
  }

  MyStruct internal my_struct;
  MyStruct[] private my_struct_dynarray;
  MyStruct[10] internal my_struct_staticarray;
  mapping(uint256 => MyStruct) private my_struct_mapping;

  enum MyEnum { State1, State2 }

  MyEnum public my_enum;
  MyEnum[] internal my_enum_dynarray;
  MyEnum[10] internal my_enum_staticarray;
  mapping(uint256 => MyEnum) private my_enum_mapping;

  struct MyComplexStruct {
    uint256[] uint256_dynarray;
    mapping(string => MyEnum) mapping_enums;
    MyStruct other_struct;
  }

  MyComplexStruct internal my_complex_struct;
  MyStruct internal my_other_struct;
}

contract StorageInheritGrandParent {
  uint256 v0;
  uint256 v1;
}

contract StorageInheritParent1 is StorageInheritGrandParent {
  uint256 v2;
  uint256 v3;
}

contract StorageInheritParent2 is StorageInheritGrandParent {
  uint256 v4;
  uint256 v5;
}

contract StorageInheritChild is StorageInheritParent1, StorageInheritParent2 {
  uint256 v6;
  uint256 v7;
}

contract StorageUpgrade_Equal_V1 {
  uint x1;
  function foo() external {}
}

contract StorageUpgrade_Equal_V2 {
  uint x1;
  function foo() external {}
  function bar() external {}
}

contract StorageUpgrade_Append_V1 {
  uint x1;
}

contract StorageUpgrade_Append_V2 {
  uint x1;
  uint x2;
}

contract StorageUpgrade_Delete_V1 {
  uint x1;
  address x2;
}

contract StorageUpgrade_Delete_V2 {
  address x2;
}
