// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

contract HasEmptyConstructorNatspec {
  constructor() { }
}

/// @custom:openzeppelin-upgrade-allow-unsafe constructor
contract HasNonEmptyConstructorNatspec1 {
  constructor() { msg.sender; }
}

contract HasNonEmptyConstructorNatspec2 {
  /// @custom:openzeppelin-upgrade-allow-unsafe constructor
  constructor() { msg.sender; }
}

contract ParentHasNonEmptyConstructorNatspec1 is HasNonEmptyConstructorNatspec1 {}
contract ParentHasNonEmptyConstructorNatspec2 is HasNonEmptyConstructorNatspec2 {}
contract AncestorHasNonEmptyConstructorNatspec1 is ParentHasNonEmptyConstructorNatspec1 {}
contract AncestorHasNonEmptyConstructorNatspec2 is ParentHasNonEmptyConstructorNatspec2 {}

/// @custom:openzeppelin-upgrade-allow-unsafe state-variable-assignment
contract HasStateVariableAssignmentNatspec1 {
  uint x = 1;
}

contract HasStateVariableAssignmentNatspec2 {
  /// @custom:openzeppelin-upgrade-allow-unsafe state-variable-assignment
  uint x = 1;
}

/// @custom:openzeppelin-upgrade-allow-unsafe state-variable-immutable state-variable-assignment
contract HasImmutableStateVariableNatspec1 {
  uint immutable x = 1;
}

contract HasImmutableStateVariableNatspec2 {
  /// @custom:openzeppelin-upgrade-allow-unsafe state-variable-immutable state-variable-assignment
  uint immutable x = 1;
}

/// @custom:openzeppelin-upgrade-allow-unsafe selfdestruct
contract HasSelfDestructNatspec1 {
  function d() public {
    selfdestruct(payable(msg.sender));
  }
}

contract HasSelfDestructNatspec2 {
  /// @custom:openzeppelin-upgrade-allow-unsafe selfdestruct
  function d() public {
    selfdestruct(payable(msg.sender));
  }
}

contract HasSelfDestructNatspec3 {
  function d() public {
    /// @custom:openzeppelin-upgrade-allow-unsafe selfdestruct
    selfdestruct(payable(msg.sender));
  }
}

/// @custom:openzeppelin-upgrade-allow-unsafe delegatecall
contract HasDelegateCallNatspec1 {
  function d() public {
    (bool s, ) = msg.sender.delegatecall("");
    s;
  }
}

contract HasDelegateCallNatspec2 {
  /// @custom:openzeppelin-upgrade-allow-unsafe delegatecall
  function d() public {
    (bool s, ) = msg.sender.delegatecall("");
    s;
  }
}

contract HasDelegateCallNatspec3 {
  function d() public {
    /// @custom:openzeppelin-upgrade-allow-unsafe delegatecall
    (bool s, ) = msg.sender.delegatecall("");
    s;
  }
}

import './ValidationsNatspecImport.sol';

contract ImportedParentHasStateVariableAssignmentNatspec1 is ImportedHasStateVariableAssignmentNatspec1 {}
contract ImportedParentHasStateVariableAssignmentNatspec2 is ImportedHasStateVariableAssignmentNatspec2 {}

// For each of 3 dimensions, libraries usage can be
// 1. implicit or explicit (_use for_ directive or not)
// 2. upgrade safe or unsafe
// 3. internal or external (method's visibility)

// libs

library SafeInternalLibraryNatspec {
  function add(uint x, uint y) internal pure returns (uint) {
    return x + y;
  }
}

library SafeExternalLibraryNatspec {
  function add(uint x, uint y) public pure returns (uint) {
    return x + y;
  }
}

library UnsafeInternalLibraryNatspec {
  function explode(uint x, uint y) internal {
    x + y;
    /// @custom:openzeppelin-upgrade-allow-unsafe selfdestruct
    selfdestruct(payable(msg.sender));
  }
}

library UnsafeExternalLibraryNatspec {
  function explode(uint x, uint y) public {
    x + y;
    /// @custom:openzeppelin-upgrade-allow-unsafe selfdestruct
    selfdestruct(payable(msg.sender));
  }
}

// usage

contract UsesImplicitSafeInternalLibraryNatspec {
  using SafeInternalLibraryNatspec for uint;
  uint x;

  function foo(uint y) public view {
    x.add(y);
  }
}

/// @custom:openzeppelin-upgrade-allow-unsafe external-library-linking
contract UsesImplicitSafeExternalLibraryNatspec {
  using SafeExternalLibraryNatspec for uint;
  uint x;

  function foo(uint y) public view {
    x.add(y);
  }
}

contract UsesImplicitUnsafeInternalLibraryNatspec {
  using UnsafeInternalLibraryNatspec for uint;
  uint x;

  function foo(uint y) public {
    x.explode(y);
  }
}

/// @custom:openzeppelin-upgrade-allow-unsafe external-library-linking
contract UsesImplicitUnsafeExternalLibraryNatspec {
  using UnsafeExternalLibraryNatspec for uint;
  uint x;

  function foo(uint y) public {
    x.explode(y);
  }
}

contract UsesExplicitSafeInternalLibraryNatspec {
  uint x;

  function foo(uint y) public view {
    SafeInternalLibraryNatspec.add(x, y);
  }
}

/// @custom:openzeppelin-upgrade-allow-unsafe external-library-linking
contract UsesExplicitSafeExternalLibraryNatspec {
  uint x;

  function foo(uint y) public view {
    SafeExternalLibraryNatspec.add(x, y);
  }
}

contract UsesExplicitUnsafeInternalLibraryNatspec {
  uint x;

  function foo(uint y) public {
    UnsafeInternalLibraryNatspec.explode(x, y);
  }
}

/// @custom:openzeppelin-upgrade-allow-unsafe external-library-linking
contract UsesExplicitUnsafeExternalLibraryNatspec {
  uint x;

  function foo(uint y) public {
    UnsafeExternalLibraryNatspec.explode(x, y);
  }
}

/// @custom:openzeppelin-upgrade-allow-unsafe inline-assembly
contract HasInlineAssemblyNatspec1 {
    function unsafe() public {
        assembly {
            // Anything could happen here (delegate call / selfdestruct)
        }
    }
}

contract HasInlineAssemblyNatspec2 {
    /// @custom:openzeppelin-upgrade-allow-unsafe inline-assembly
    function unsafe() public {
        assembly {
            // Anything could happen here (delegate call / selfdestruct)
        }
    }
}

contract HasInlineAssemblyNatspec3 {
    function unsafe() public {
        /// @custom:openzeppelin-upgrade-allow-unsafe inline-assembly
        assembly {
            // Anything could happen here (delegate call / selfdestruct)
        }
    }
}
