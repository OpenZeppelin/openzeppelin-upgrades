pragma solidity ^0.5.1;

contract Action {
    enum ActionType { UP, DOWN }
    event ActionEvent(ActionType actionType);

    function initialize() public view {
    }

    function log(ActionType action) public {
        emit ActionEvent(action);
    }

}
