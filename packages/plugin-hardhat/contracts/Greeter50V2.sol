pragma solidity ^0.5.1;

contract Greeter50V2 {

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

}

import "./utils/Proxiable50.sol";
contract Greeter50V2Proxiable is Greeter50V2, Proxiable50 {}
