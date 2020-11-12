pragma solidity ^0.5.1;

contract Action {
    enum ActionType { UP, DOWN }
    event ActionEvent(ActionType actionType);

    function log(ActionType action) public {
        emit ActionEvent(action);
    }

}
