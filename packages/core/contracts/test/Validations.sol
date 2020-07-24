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
    (bool s, ) = msg.sender.delegatecall("");
    s;
  }
}

import './ValidationsImport.sol';

contract ImportedParentHasStateVariableAssignment is ImportedHasStateVariableAssignment {
}

library SafeLibrary {
  function add(uint x, uint y) public pure returns (uint) {
    return x + y;
  }
}

library UnsafeLibrary {
  function explode(uint x, uint y) public {
    x + y;
    selfdestruct(msg.sender);
  }
}

contract UsingForSafeLibrary {
  using SafeLibrary for uint;
  uint x;

  function foo(uint y) public view {
    x.add(y);
  }
}

contract UsingExplicitSafeLibrary {
  uint x;

  function foo(uint y) public view {
    SafeLibrary.add(x, y);
  }
}

contract UsingForUnsafeLibrary {
  using UnsafeLibrary for uint;
  uint x;

  function foo(uint y) public {
    x.explode(y);
  }
}

contract UsingExplicitUnsafeLibrary {
  uint x;

  function foo(uint y) public {
    UnsafeLibrary.explode(x, y);
  }
}
