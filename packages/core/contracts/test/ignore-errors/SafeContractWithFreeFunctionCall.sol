// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./RiskyFreeFunctions.sol" as RiskyFreeFunctions;

contract SafeContractWithFreeFunctionCall {
    function safe() public view returns (bool) {
        return RiskyFreeFunctions.isContract(address(this));
    }
}
