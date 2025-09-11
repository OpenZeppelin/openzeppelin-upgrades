// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

/// @custom:oz-upgrades-unsafe-allow selfdestruct
contract HasSelfDestructNatspec1 {
    function d() public {
        selfdestruct(payable(msg.sender));
    }
}

contract HasSelfDestructNatspec2 {
    /// @custom:oz-upgrades-unsafe-allow selfdestruct
    function d() public {
        selfdestruct(payable(msg.sender));
    }
}

contract HasSelfDestructNatspec3 {
    function d() public {
        /// @custom:oz-upgrades-unsafe-allow selfdestruct
        selfdestruct(payable(msg.sender));
    }
}

library UnsafeInternalLibraryNatspec {
    function explode(uint x, uint y) internal {
        x + y;
        /// @custom:oz-upgrades-unsafe-allow selfdestruct
        selfdestruct(payable(msg.sender));
    }
}

library UnsafeExternalLibraryNatspec {
    function explode(uint x, uint y) public {
        x + y;
        /// @custom:oz-upgrades-unsafe-allow selfdestruct
        selfdestruct(payable(msg.sender));
    }
}

contract UsesImplicitUnsafeInternalLibraryNatspec {
    using UnsafeInternalLibraryNatspec for uint;
    uint x;

    function foo(uint y) public {
        x.explode(y);
    }
}

/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract UsesImplicitUnsafeExternalLibraryNatspec {
    using UnsafeExternalLibraryNatspec for uint;
    uint x;

    function foo(uint y) public {
        x.explode(y);
    }
}

contract UsesExplicitUnsafeInternalLibraryNatspec {
    uint x;

    function foo(uint y) public {
        UnsafeInternalLibraryNatspec.explode(x, y);
    }
}

/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract UsesExplicitUnsafeExternalLibraryNatspec {
    uint x;

    function foo(uint y) public {
        UnsafeExternalLibraryNatspec.explode(x, y);
    }
}
