pragma solidity ^0.5.1;

import "@nomiclabs/buidler/console.sol";

contract GreeterV3 {

    string greeting;

    function initialize(string memory _greeting) public {
        console.log("Deploying a Greeter with greeting:", _greeting);
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        console.log("Changing greeting from '%s' to '%s'", greeting, _greeting);
        greeting = _greeting;
    }

    function resetGreeting() public {
        console.log("Resetting greeting to 'Hello World'");
        greeting = "Hello World";
    }

    function version() public pure returns (string memory) {
        return "V3";
    }

}
