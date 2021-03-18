// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

contract DeployOverload {
    uint public value;

    function customInitialize() public {
        value = 42;
    }

}

import "./utils/Proxiable.sol";
contract DeployOverloadProxiable is DeployOverload, Proxiable {}
