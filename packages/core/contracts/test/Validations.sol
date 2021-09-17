// SPDX-License-Identifier: MIT
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

// This helps the tests by hinting Hardhat to compile the two files together.
import './Storage.sol';

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

// For each of 3 dimensions, libraries usage can be
// 1. implicit or explicit (_use for_ directive or not)
// 2. upgrade safe or unsafe
// 3. internal or external (method's visibility)

// libs

library SafeInternalLibrary {
  function add(uint x, uint y) internal pure returns (uint) {
    return x + y;
  }
}

library SafeExternalLibrary {
  function add(uint x, uint y) public pure returns (uint) {
    return x + y;
  }
}

library UnsafeInternalLibrary {
  function explode(uint x, uint y) internal {
    x + y;
    selfdestruct(msg.sender);
  }
}

library UnsafeExternalLibrary {
  function explode(uint x, uint y) public {
    x + y;
    selfdestruct(msg.sender);
  }
}

// usage

contract UsesImplicitSafeInternalLibrary {
  using SafeInternalLibrary for uint;
  uint x;

  function foo(uint y) public view {
    x.add(y);
  }
}

contract UsesImplicitSafeExternalLibrary {
  using SafeExternalLibrary for uint;
  uint x;

  function foo(uint y) public view {
    x.add(y);
  }
}

contract UsesImplicitUnsafeInternalLibrary {
  using UnsafeInternalLibrary for uint;
  uint x;

  function foo(uint y) public {
    x.explode(y);
  }
}

contract UsesImplicitUnsafeExternalLibrary {
  using UnsafeExternalLibrary for uint;
  uint x;

  function foo(uint y) public {
    x.explode(y);
  }
}

contract UsesExplicitSafeInternalLibrary {
  uint x;

  function foo(uint y) public view {
    SafeInternalLibrary.add(x, y);
  }
}

contract UsesExplicitSafeExternalLibrary {
  uint x;

  function foo(uint y) public view {
    SafeExternalLibrary.add(x, y);
  }
}

contract UsesExplicitUnsafeInternalLibrary {
  uint x;

  function foo(uint y) public {
    UnsafeInternalLibrary.explode(x, y);
  }
}

contract UsesExplicitUnsafeExternalLibrary {
  uint x;

  function foo(uint y) public {
    UnsafeExternalLibrary.explode(x, y);
  }
}

contract HasInternalUpgradeToFunction {
  function upgradeTo(address) internal {}
}

contract HasUpgradeToFunction {
  function upgradeTo(address) public {}
}

contract ParentHasUpgradeToFunction is HasUpgradeToFunction {
}

contract HasInlineAssembly {
  function unsafe() public {
    assembly {
      // Anything could happen here (delegate call / selfdestruct)
    }
  }
}

library TransitiveLibrary {
    function f3() internal {
        selfdestruct(msg.sender);
    }
}
library DirectLibrary {
    function f2() internal {
        TransitiveLibrary.f3();
    }
}
contract TransitiveLibraryIsUnsafe {
    function f1() public {
        DirectLibrary.f2();
    }
}
