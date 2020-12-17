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

contract StorageUpgrade_Struct_V1 {
    struct Struct {
        uint x;
        string s1;
        string s2;
    }
    Struct data;
}

contract StorageUpgrade_Struct_V2_Ok {
    struct StructRenamed {
        uint x;
        string s1;
        string s2;
    }
    StructRenamed data;
}

contract StorageUpgrade_Struct_V2_Bad {
    struct StructRenamed {
        uint x;
        string s2;
    }
    StructRenamed data;
}

contract StorageUpgrade_Enum_V1 {
    enum Enum {
        A,
        B
    }
    Enum data;
}

contract StorageUpgrade_Enum_V2_Ok {
    enum Enum {
        A,
        B,
        C
    }
    Enum data;
}

contract StorageUpgrade_Enum_V2_Bad {
    enum Enum {
        A,
        C,
        B
    }
    Enum data;
}

contract StorageUpgrade_Enum_V2_TooLarge {
    enum Enum {
        A,
        B,
        V3, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14, V15, V16, V17, V18, V19, V20, V21, V22, V23, V24, V25, V26, V27, V28, V29, V30, V31, V32, V33, V34, V35, V36, V37, V38, V39, V40, V41, V42, V43, V44, V45, V46, V47, V48, V49, V50, V51, V52, V53, V54, V55, V56, V57, V58, V59, V60, V61, V62, V63, V64, V65, V66, V67, V68, V69, V70, V71, V72, V73, V74, V75, V76, V77, V78, V79, V80, V81, V82, V83, V84, V85, V86, V87, V88, V89, V90, V91, V92, V93, V94, V95, V96, V97, V98, V99, V100, V101, V102, V103, V104, V105, V106, V107, V108, V109, V110, V111, V112, V113, V114, V115, V116, V117, V118, V119, V120, V121, V122, V123, V124, V125, V126, V127, V128, V129, V130, V131, V132, V133, V134, V135, V136, V137, V138, V139, V140, V141, V142, V143, V144, V145, V146, V147, V148, V149, V150, V151, V152, V153, V154, V155, V156, V157, V158, V159, V160, V161, V162, V163, V164, V165, V166, V167, V168, V169, V170, V171, V172, V173, V174, V175, V176, V177, V178, V179, V180, V181, V182, V183, V184, V185, V186, V187, V188, V189, V190, V191, V192, V193, V194, V195, V196, V197, V198, V199, V200, V201, V202, V203, V204, V205, V206, V207, V208, V209, V210, V211, V212, V213, V214, V215, V216, V217, V218, V219, V220, V221, V222, V223, V224, V225, V226, V227, V228, V229, V230, V231, V232, V233, V234, V235, V236, V237, V238, V239, V240, V241, V242, V243, V244, V245, V246, V247, V248, V249, V250, V251, V252, V253, V254, V255, V256,
        OneTooMany
    }
    Enum data;
}
