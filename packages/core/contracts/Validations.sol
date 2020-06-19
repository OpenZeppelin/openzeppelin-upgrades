// SPDX-License-Identifier: MIT
pragma solidity ^0.6.8;

contract HasEmptyConstructor {
  constructor() public { }
}

contract HasNonEmptyConstructor {
  constructor() public { msg.sender; }
}

contract HasConstructorModifier {
  modifier mod() { _; }
  constructor() mod public { }
}

contract ParentHasNonEmptyConstructor is HasNonEmptyConstructor {
}

contract AncestorHasNonEmptyConstructor is ParentHasNonEmptyConstructor {
}

contract HasStateVariable {
  uint x;
}

contract HasStateVariableAssignment {
  uint x = 1;
}

contract HasConstantStateVariableAssignment {
  uint constant x = 1;
}

contract HasImmutableStateVariable {
  uint immutable x = 1;
}

contract HasSelfDestruct {
  function d() public {
    selfdestruct(msg.sender);
  }
}

contract HasDelegateCall {
  function d() public {
    msg.sender.delegatecall("");
  }
}

import './ValidationsImport.sol';

contract ImportedParentHasStateVariableAssignment is ImportedHasStateVariableAssignment {
}
