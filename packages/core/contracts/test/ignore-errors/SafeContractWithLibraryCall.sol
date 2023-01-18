// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./RiskyLibrary.sol";

contract SafeContractWithLibraryCall {
    function safe() public view returns (bool) {
        return RiskyLibrary.isContract(address(this));
    }
}
