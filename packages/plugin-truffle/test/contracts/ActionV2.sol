pragma solidity ^0.5.1;

import "@nomiclabs/buidler/console.sol";

contract ActionV2 {
    enum ActionType { UP, DOWN, LEFT, RIGHT }
    event ActionEvent(ActionType actionType);


    function initialize() public view {
        console.log("Deploying ActionV2");
    }

    function log(ActionType action) public {
        emit ActionEvent(action);
    }

}
