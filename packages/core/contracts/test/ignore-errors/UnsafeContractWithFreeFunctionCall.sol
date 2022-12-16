// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./RiskyFreeFunctions.sol" as RiskyFreeFunctions;

contract UnsafeContractWithFreeFunctionCall {
    function unsafe(address target, bytes memory data) public {
        RiskyFreeFunctions.freeDelegateCall(target, data);
    }
}
