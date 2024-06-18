// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NamespacedExternalFunctionPointer {
    /// @custom:storage-location erc7201:example.main
    struct S {
        function(bool) external foo;
    }
}

contract NamespacedInternalFunctionPointer {
    /// @custom:storage-location erc7201:example.main
    struct S {
        function(bool) internal foo;
    }
}

contract NamespacedInternalFunctionPointerUsed {
    /// @custom:storage-location erc7201:example.main
    struct S {
        function(bool) internal foo;
    }
    S s; // NOTE: This is unsafe usage of a namespace!
}

contract StructInternalFunctionPointerUsed {
    // not a namespace, but it is referenced
    struct S {
        function(bool) internal foo;
    }
    S s;
}

contract NonNamespacedInternalFunctionPointer {
    // not a namespace, and not referenced
    struct S {
        function(bool) internal foo;
    }
}

contract NamespacedImpliedInternalFunctionPointer {
    /// @custom:storage-location erc7201:example.main
    struct S {
        function(bool) foo;
    }
}

struct StandaloneStructInternalFn {
    function(bool) internal foo;
}

contract UsesStandaloneStructInternalFn {
    StandaloneStructInternalFn bad;
}

struct StructUsesStandaloneStructInternalFn {
    StandaloneStructInternalFn bad;
}

contract NamespacedUsesStandaloneStructInternalFn {
    /// @custom:storage-location erc7201:example.main
    struct Bad {
        StandaloneStructInternalFn bad;
    }
}

contract RecursiveStructInternalFn {
    StructUsesStandaloneStructInternalFn bad;
}

contract MappingRecursiveStructInternalFn {
    mapping(address => mapping(address => StructUsesStandaloneStructInternalFn)) bad;
}

contract ArrayRecursiveStructInternalFn {
    StructUsesStandaloneStructInternalFn[][] bad;
}

contract SelfRecursiveMappingStructInternalFn {
    /// @custom:storage-location erc7201:example.main
    struct SelfRecursive {
        mapping(address => SelfRecursive) selfReference;
        mapping(address => StructUsesStandaloneStructInternalFn) bad;
    }
}

contract SelfRecursiveArrayStructInternalFn {
    /// @custom:storage-location erc7201:example.main
    struct SelfRecursiveArray {
        SelfRecursiveArray[] selfReference;
        StructUsesStandaloneStructInternalFn[] bad;
    }
}

contract ExternalFunctionPointer {
    function(bool) external foo;
}

contract InternalFunctionPointer {
    function(bool) internal foo;
}

contract ImpliedInternalFunctionPointer {
    function(bool) foo;
}

contract FunctionWithInternalFunctionPointer {
    uint208 x;

    function doOp(
        function(uint208, uint208) view returns (uint208) op,
        uint208 y
    ) internal view returns (uint208) {
        return op(x, y);
    }
}
