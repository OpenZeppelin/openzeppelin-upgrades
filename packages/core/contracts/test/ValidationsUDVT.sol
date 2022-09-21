// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract ValidationsUDVT {
  type MyUserValueType is uint128;
  MyUserValueType my_user_value;
  function foo(MyUserValueType v) external {
      my_user_value = v;
  }
}
