pragma solidity ^0.5.1;

contract Invalid {

    function initialize() public view {
    }

    function oops() public {
        selfdestruct(msg.sender);
    }

}
