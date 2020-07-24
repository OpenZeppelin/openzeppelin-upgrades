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

// Internal libs

library SafeInternalLibrary {
  function add(uint x, uint y) internal pure returns (uint) {
    return x + y;
  }
}

library UnsafeInternalLibrary {
  function explode(uint x, uint y) internal {
    x + y;
    selfdestruct(msg.sender);
  }
}

contract UsingForSafeInternalLibrary {
  using SafeInternalLibrary for uint;
  uint x;

  function foo(uint y) public view {
    x.add(y);
  }
}

contract UsingExplicitSafeInternalLibrary {
  uint x;

  function foo(uint y) public view {
    SafeInternalLibrary.add(x, y);
  }
}

contract UsingForUnsafeInternalLibrary {
  using UnsafeInternalLibrary for uint;
  uint x;

  function foo(uint y) public {
    x.explode(y);
  }
}

contract UsingExplicitUnsafeInternalLibrary {
  uint x;

  function foo(uint y) public {
    UnsafeInternalLibrary.explode(x, y);
  }
}


// external libs

library SafeExternalLibrary {
  function add(uint x, uint y) public pure returns (uint) {
    return x + y;
  }
}

library UnsafeExternalLibrary {
  function explode(uint x, uint y) public {
    x + y;
    selfdestruct(msg.sender);
  }
}

contract UsingForSafeExternalLibrary {
  using SafeExternalLibrary for uint;
  uint x;

  function foo(uint y) public view {
    x.add(y);
  }
}

contract UsingExplicitSafeExternalLibrary {
  uint x;

  function foo(uint y) public view {
    SafeExternalLibrary.add(x, y);
  }
}

contract UsingForUnsafeExternalLibrary {
  using UnsafeExternalLibrary for uint;
  uint x;

  function foo(uint y) public {
    x.explode(y);
  }
}

contract UsingExplicitUnsafeExternalLibrary {
  uint x;

  function foo(uint y) public {
    UnsafeExternalLibrary.explode(x, y);
  }
}
