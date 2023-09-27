// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// This is not valid according to ERC-7201 because the namespaced struct is outside of a contract.

/// @custom:storage-location erc7201:example.main
struct MainStorage {
    uint256 x;
    uint256 y;
}

contract Example {
    // keccak256(abi.encode(uint256(keccak256("example.main")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant MAIN_STORAGE_LOCATION =
        0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500;

    function _getMainStorage() private pure returns (MainStorage storage $) {
        assembly {
            $.slot := MAIN_STORAGE_LOCATION
        }
    }

    function _getXTimesY() internal view returns (uint256) {
        MainStorage storage $ = _getMainStorage();
        return $.x * $.y;
    }
}
