// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./RiskyLibrary.sol";

contract SafeContractWithLibraryUsingFor {
    using RiskyLibrary for address;

    function safe() public view returns (bool) {
        return address(this).isContract();
    }
}
