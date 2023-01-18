// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract UnsafeContract {
    function externalDelegateCall(
        address target,
        bytes memory data
    ) external returns (bytes memory) {
        (, bytes memory returndata) = target.delegatecall(data);
        return returndata;
    }
}
