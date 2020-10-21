pragma solidity ^0.5.1;

contract ActionV2 {
    enum ActionType { UP, DOWN, LEFT, RIGHT }
    event ActionEvent(ActionType actionType);

    function log(ActionType action) public {
        emit ActionEvent(action);
    }

}
