// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

function isContract(address account) view returns (bool) {
    return account.code.length > 0;
}

function freeDelegateCall(
    address target,
    bytes memory data
) returns (bytes memory) {
    (, bytes memory returndata) = target.delegatecall(data);
    return returndata;
}
