pragma solidity >= 0.6.0 <0.8.0;

contract GreeterFallback {

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

    fallback() external {}
}
