// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract Memory08 {
  mapping(string => address) a;
  mapping(bytes => address) b;
}

contract Memory08Bad {
  mapping(bytes => address) a;
  mapping(string => address) b;
}
