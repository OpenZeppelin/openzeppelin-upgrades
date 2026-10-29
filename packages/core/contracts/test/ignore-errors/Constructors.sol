// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

abstract contract UnsafeParent {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(bytes memory data) {
        (bool s, ) = msg.sender.delegatecall(data);
        s;
    }
}

contract UnsafeChild1 is UnsafeParent {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() UnsafeParent('') {}

    function foo1(uint x) public {}
}

contract UnsafeChild2 is UnsafeParent('') {
    function foo2(uint x) public {}
}

abstract contract UnsafeParentNoArgs {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        (bool s, ) = msg.sender.delegatecall("");
        s;
    }
}

contract UnsafeChild3 is UnsafeParentNoArgs {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() UnsafeParentNoArgs() {}

    function foo3(uint x) public {}
}

contract UnsafeChild4 is UnsafeParentNoArgs {
    function foo4(uint x) public {}
}

/**
 * @custom:oz-upgrades-unsafe-allow delegatecall
 */
abstract contract AllowParentNoArgs {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        (bool s, ) = msg.sender.delegatecall("");
        s;
    }
}

contract AllowChild5 is AllowParentNoArgs {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() AllowParentNoArgs() {}

    function foo5(uint x) public {}
}

contract AllowChild6 is AllowParentNoArgs {
    function foo6(uint x) public {}
}

/**
 * allow has no effect because the delegatecall is in a parent function
 *
 * @custom:oz-upgrades-unsafe-allow delegatecall
 */
contract UnsafeAllowChild7 is UnsafeParentNoArgs {
    function foo7(uint x) public {}
}

/**
 * @custom:oz-upgrades-unsafe-allow-reachable delegatecall
 */
contract AllowReachableChild8 is UnsafeParentNoArgs {
    function foo8(uint x) public {}
}

abstract contract UnsafeFunctions {
    function unsafe() internal {
        (bool s, ) = msg.sender.delegatecall("");
        s;
    }
}

contract UnsafeChild9 is UnsafeFunctions {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        unsafe();
    }

    function foo9(uint x) public {}
}

abstract contract ParentHasConstructor {
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    uint256 immutable x;
    constructor(uint256 _x) {
        x = _x;
    }
}

/// @custom:oz-upgrades-unsafe-allow constructor
contract ChildHasAllowConstructor_Bad is ParentHasConstructor {
    constructor() ParentHasConstructor(1) {}
}

/// @custom:oz-upgrades-unsafe-allow-reachable constructor
contract ChildHasAllowReachableConstructor_Ok is ParentHasConstructor {
    constructor() ParentHasConstructor(1) {}
}
