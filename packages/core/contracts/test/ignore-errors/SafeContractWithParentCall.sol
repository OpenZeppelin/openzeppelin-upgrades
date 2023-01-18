// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./RiskyParentContract.sol";

contract SafeContractWithParentCall is RiskyParentContract {
    function safe() public view returns (bool) {
        return isContract(address(this));
    }
}
