pragma solidity ^0.5.1;

contract DeployOverload {
    uint public value;

    function customInitialize() public {
        value = 42;
    }

}
