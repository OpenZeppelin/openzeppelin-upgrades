pragma solidity ^0.5.1;

contract Action {
    enum ActionType { UP, DOWN }
    event ActionEvent(ActionType actionType);

    ActionType action;

    function initialize() public view {
    }

    function log() public {
        emit ActionEvent(action);
    }

}
