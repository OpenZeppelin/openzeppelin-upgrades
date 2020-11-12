pragma solidity ^0.5.1;

import "hardhat/console.sol";

contract Invalid {

    function initialize() public view {
        console.log("This is an invalid contract, it should not be deployed");
    }

    function oops() public {
        selfdestruct(msg.sender);
    }

}
