// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

contract Invalid {

    function initialize() public view {
    }

    function oops() public {
        selfdestruct(msg.sender);
    }

}

import "./utils/Proxiable.sol";
contract InvalidProxiable is Invalid, Proxiable {}
