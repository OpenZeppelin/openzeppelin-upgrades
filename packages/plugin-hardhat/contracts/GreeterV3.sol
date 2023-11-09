pragma solidity ^0.5.1;

contract GreeterV3 {

    string greeting;

    function initialize(string memory _greeting) public {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }

    function resetGreeting() public {
        greeting = "Hello World";
    }

    function version() public pure returns (string memory) {
        return "V3";
    }

}

import "./utils/Proxiable.sol";
contract GreeterV3Proxiable is GreeterV3, Proxiable {}

import "./utils/Proxiable40.sol";
contract GreeterV3Proxiable40 is GreeterV3, Proxiable40 {}