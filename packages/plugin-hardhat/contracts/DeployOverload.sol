pragma solidity ^0.5.1;

contract DeployOverload {
    uint public value;

    function customInitialize() public {
        value = 42;
    }

}

import "./utils/Proxiable.sol";
contract DeployOverloadProxiable is DeployOverload, Proxiable {}
