// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract Storage089 {
  type MyUserValueType is uint128;
  MyUserValueType my_user_value;
}

contract Storage089_V2 {
  type MyUserValueType is uint128;
  MyUserValueType my_user_value;

  uint x;
}

contract Storage089_V3 {
  type MyUserValueType is uint8;
  MyUserValueType my_user_value;

  uint x;
}

contract Storage089_MappingUVDTKey_V1 {
  type MyUserValueType is bool;

  mapping (MyUserValueType => uint) m1;
  mapping (MyUserValueType => uint) m2;
  mapping (uint8 => uint) m3;
}

contract Storage089_MappingUVDTKey_V2_Ok {
  type MyUserValueType is uint8;

  mapping (MyUserValueType => uint) m1;
  mapping (MyUserValueType => uint) m2;
  mapping (uint8 => uint) m3;
}

contract Storage089_MappingUVDTKey_V2_Bad {
  type MyUserValueType is uint16;

  mapping (MyUserValueType => uint) m1;
  mapping (MyUserValueType => uint) m2;
  mapping (uint8 => uint) m3;
}