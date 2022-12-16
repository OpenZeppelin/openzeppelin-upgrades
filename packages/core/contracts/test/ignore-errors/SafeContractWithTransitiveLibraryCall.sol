// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./TransitiveRiskyLibrary.sol";

contract SafeContractWithTransitiveLibraryCall {
    function safe() public view returns (bool) {
        return TransitiveRiskyLibrary.isContract(address(this));
    }
}
