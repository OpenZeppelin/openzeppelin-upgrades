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
