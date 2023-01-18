// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./RiskyParentContract.sol";

contract SafeRecursion is RiskyParentContract {
    function safe(uint256 i) public view returns (bool) {
        if (++i == 10) {
            return isContract(address(this));
        } else {
            return safe(i);
        }
    }
}
