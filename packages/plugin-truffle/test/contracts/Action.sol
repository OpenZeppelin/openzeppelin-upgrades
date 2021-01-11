pragma solidity ^0.5.1;

import "hardhat/console.sol";

contract Action {
    enum ActionType { UP, DOWN }
    event ActionEvent(ActionType actionType);

    ActionType action;

    function initialize() public view {
        console.log("Deploying Action");
    }

    function log() public {
        emit ActionEvent(action);
    }

}
