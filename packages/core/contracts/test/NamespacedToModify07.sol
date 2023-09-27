// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
 
contract HasFunction {
  constructor(uint) {}
  function foo() pure public returns (uint) {}
}

contract UsingFunction is HasFunction(1) {
  uint x = foo();
}
