// SPDX-License-Identifier: MIT
pragma solidity 0.8.8;

/// @custom:oz-upgrades-from SelfReference
contract SelfReference {
  uint public x;
}

/// @custom:oz-upgrades-from contracts/test/cli/SelfReferences.sol:SelfReferenceFullyQualified
contract SelfReferenceFullyQualified {
  uint public x;
}

contract NoAnnotation {
  uint public x;
}