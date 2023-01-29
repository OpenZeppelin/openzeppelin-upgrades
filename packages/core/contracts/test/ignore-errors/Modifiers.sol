// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

abstract contract UnsafeParentModifier {
    modifier unsafe(bytes memory data) {
        _;
        (bool result,)= msg.sender.delegatecall(data);
        require(result, "delegatecall failed");
    }
}

// TODO: do not throw an error in this case
// contract ModifierNotUsed is UnsafeParentModifier {
//     function foo() public {}
// }

contract ModifierUsed is UnsafeParentModifier {
    function foo() public unsafe('') {}
}
