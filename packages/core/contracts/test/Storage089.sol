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
