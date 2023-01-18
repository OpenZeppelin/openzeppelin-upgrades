// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

library RiskyLibrary {
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    function internalDelegateCall(
        address target,
        bytes memory data
    ) internal returns (bytes memory) {
        (, bytes memory returndata) = target.delegatecall(data);
        return returndata;
    }

    function privateDelegateCall(
        address target,
        bytes memory data
    ) private returns (bytes memory) {
        (, bytes memory returndata) = target.delegatecall(data);
        return returndata;
    }

    function publicDelegateCall(
        address target,
        bytes memory data
    ) public returns (bytes memory) {
        (, bytes memory returndata) = target.delegatecall(data);
        return returndata;
    }

    function externalDelegateCall(
        address target,
        bytes memory data
    ) external returns (bytes memory) {
        (, bytes memory returndata) = target.delegatecall(data);
        return returndata;
    }
}