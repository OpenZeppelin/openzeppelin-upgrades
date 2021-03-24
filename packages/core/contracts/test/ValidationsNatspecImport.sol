// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

/// @custom:openzeppelin-upgrade-allow state-variable-assignment
contract ImportedHasStateVariableAssignmentNatspec1 {
  uint x = 1;
}

contract ImportedHasStateVariableAssignmentNatspec2 {
  /// @custom:openzeppelin-upgrade-allow state-variable-assignment
  uint x = 1;
}
