// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./RiskyParentContract.sol";

contract UnsafeRecursion is RiskyParentContract {
    function unsafe(uint256 i, address target, bytes memory data) public returns (bytes memory) {
        if (++i == 10) {
            return internalDelegateCall(target, data);
        } else {
            return unsafe(i, target, data);
        }
    }
}
