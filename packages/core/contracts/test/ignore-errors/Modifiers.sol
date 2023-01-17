// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

abstract contract UnsafeParentModifier {
    modifier unsafe(bytes memory data) {
        _;
        msg.sender.delegatecall(data);
    }
}

// TODO: do not throw an error in this case
// contract ModifierNotUsed is UnsafeParentModifier {
//     function foo() public {}
// }

contract ModifierUsed is UnsafeParentModifier {
    function foo() public unsafe('') {}
}
