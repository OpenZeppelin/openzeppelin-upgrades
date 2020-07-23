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

struct Registry {
  mapping(uint => bool) registry;
}

library SafeLibrary {
  function register(Registry storage self, uint x) public {
    self.registry[x] = true;
  }
}

library UnsafeLibrary {
  function register(Registry storage self, uint x) public {
    self.registry[x] = true;
    selfdestruct(msg.sender);
  }
}

contract UsingSafeForLibrary {
  using SafeLibrary for Registry;
  Registry reg;

  function foo(uint x) public {
    reg.register(x);
  }
}

contract UsingSafeExplicitLibrary {
  Registry reg;

  function foo(uint x) public {
    SafeLibrary.register(reg, x);
  }
}

contract UsingUnsafeForLibrary {
  using UnsafeLibrary for Registry;
  Registry reg;

  function foo(uint x) public {
    reg.register(x);
  }
}

contract UsingUnsafeExplicitLibrary {
  Registry reg;

  function foo(uint x) public {
    UnsafeLibrary.register(reg, x);
  }
}
