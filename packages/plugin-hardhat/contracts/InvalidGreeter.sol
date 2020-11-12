pragma solidity ^0.5.1;

import "hardhat/console.sol";

contract GreeterStorageConflict {

    uint greets;
    string greeting;

    function initialize(string memory _greeting) public {
        console.log("Deploying a Greeter with greeting:", _greeting);
        greeting = _greeting;
    }

    function greet() public returns (string memory) {
        greets = greets + 1;
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        console.log("Changing greeting from '%s' to '%s'", greeting, _greeting);
        greeting = _greeting;
    }

}
