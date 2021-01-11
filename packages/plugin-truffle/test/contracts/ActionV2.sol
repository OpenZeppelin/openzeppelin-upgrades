pragma solidity ^0.5.1;

import "hardhat/console.sol";

contract ActionV2 {
    enum ActionType { UP, DOWN, LEFT, RIGHT }
    event ActionEvent(ActionType actionType);

    ActionType action;

    function initialize() public view {
        console.log("Deploying ActionV2");
    }

    function log() public {
        emit ActionEvent(action);
    }

}

contract ActionV2Bad {
    enum ActionType { UP, LEFT, RIGHT }
    event ActionEvent(ActionType actionType);

    ActionType action;

    function initialize() public view {
        console.log("Deploying ActionV2");
    }

    function log() public {
        emit ActionEvent(action);
    }

}
