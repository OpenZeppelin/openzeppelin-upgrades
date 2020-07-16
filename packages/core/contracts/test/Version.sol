// SPDX-License-Identifier: MIT
pragma solidity ^0.6.8;

contract Greeter {
  // one line version
  function greet() public pure returns (string memory) { return "Hi!"; }
}

contract GreeterDifferentFormatting {
  function greet() public pure returns (string memory) {
    // expanded version
    return "Hi!";
  }
}
