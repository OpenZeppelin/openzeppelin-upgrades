// SPDX-License-Identifier: MIT
pragma solidity ^0.6.8;

// This helps the tests by hinting Hardhat to compile the two files together.
import './Storage.sol';

contract SameName {
  function d() public {
    (bool s, ) = msg.sender.delegatecall("");
    s;
  }
}
